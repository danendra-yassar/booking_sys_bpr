const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./db_connection');
const app = express();
const PORT = 3000;
const FE_DIR = path.join(__dirname, '..', 'fe');


// Parser request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session login
app.use(
    session({
        name: 'booking.sid',
        secret: process.env.SESSION_SECRET || 'booking-room-bpr-development-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 8 * 60 * 60 * 1000 
        }
    })
);

// Serve frontend
app.use(express.static(FE_DIR));

// helper
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Anda belum login.'
        });
    }

    next();
}

// utk buat room, hapus jadwal, dan hapus room
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Anda belum login.'
        });
    }

    if (req.session.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Akses hanya untuk admin.'
        });
    }

    next();
}


function timeToMinutes(time) {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        return null;
    }

    const [hour, minute] = time.split(':').map(Number);

    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }

    return hour * 60 + minute;
}

// format tanggal
function isValidDate(date) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const parsed = new Date(`${date}T00:00:00`);

    return !Number.isNaN(parsed.getTime());
}

// cek bentrok jadwal room
async function checkRoomConflict(
    idRoom,
    tanggalBooking,
    waktuMulai,
    waktuSelesai,
    excludeBookingId = null
) {
    let sql = `
        SELECT id_booking
        FROM booking_history
        WHERE id_room = ?
          AND tanggal_booking = ?
          AND waktu_mulai < ?
          AND waktu_selesai > ?
    `;

    const params = [
        idRoom,
        tanggalBooking,
        waktuSelesai,
        waktuMulai
    ];

    if (excludeBookingId !== null) {
        sql += ` AND id_booking <> ?`;
        params.push(excludeBookingId);
    }

    const [rows] = await db.execute(sql, params);

    return rows.length > 0;
}


// cek total durasi booking user dalam satu hari
async function getUserDailyBookingMinutes(
    idUser,
    tanggalBooking,
    excludeBookingId = null
) {
    let sql = `
        SELECT COALESCE(
            SUM(
                TIME_TO_SEC(
                    TIMEDIFF(waktu_selesai, waktu_mulai)
                ) / 60
            ),
            0
        ) AS total_minutes
        FROM booking_history
        WHERE id_user = ?
          AND tanggal_booking = ?
    `;

    const params = [
        idUser,
        tanggalBooking
    ];

    if (excludeBookingId !== null) {
        sql += ` AND id_booking <> ?`;
        params.push(excludeBookingId);
    }

    const [rows] = await db.execute(sql, params);

    return Number(rows[0].total_minutes || 0);
}


// login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username dan password harus diisi.'
            });
        }

        const [rows] = await db.execute(
            `
            SELECT
                id_user,
                username,
                password,
                role
            FROM user_login
            WHERE username = ?
            LIMIT 1
            `,
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah.'
            });
        }

        const user = rows[0];

        const passwordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah.'
            });
        }

        // Regenerate session setelah login
        req.session.regenerate((err) => {
            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: 'Gagal membuat session.'
                });
            }

            req.session.user = {
                id_user: user.id_user,
                username: user.username,
                role: user.role
            };

            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error(saveErr);

                    return res.status(500).json({
                        success: false,
                        message: 'Gagal menyimpan session.'
                    });
                }

                return res.json({
                    success: true,
                    message: 'Login berhasil.',
                    user: {
                        id_user: user.id_user,
                        username: user.username,
                        role: user.role
                    },
                    redirect: '/index.html'
                });
            });
        });

    } catch (error) {
        console.error('LOGIN ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server.'
        });
    }
});


// cek session login
app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({
        success: true,
        user: req.session.user
    });
});

//create user
app.post('/api/users', requireAdmin, async (req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!username || username.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Username harus diisi.'
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password minimal 6 karakter.'
            });
        }

        const allowedRoles = ['user', 'admin'];

        if (!role || !allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Role harus berupa user atau admin.'
            });
        }

        const cleanUsername = username.trim();

        // Cek username sudah digunakan atau belum
        const [existingUsers] = await db.execute(
            `
            SELECT id_user
            FROM user_login
            WHERE username = ?
            LIMIT 1
            `,
            [cleanUsername]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username sudah digunakan.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            `
            INSERT INTO user_login
            (
                username,
                password,
                role
            )
            VALUES (?, ?, ?)
            `,
            [
                cleanUsername,
                hashedPassword,
                role
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'User berhasil dibuat.',
            data: {
                id_user: result.insertId,
                username: cleanUsername,
                role
            }
        });

    } catch (error) {
        console.error('CREATE USER ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Gagal membuat user.'
        });
    }
});


//logout
app.post('/api/auth/logout', requireAuth, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Gagal logout.'
            });
        }

        res.clearCookie('booking.sid');

        return res.json({
            success: true,
            message: 'Logout berhasil.',
            redirect: '/login.html'
        });
    });
});


// read rooms
app.get('/api/rooms', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                id_room,
                nama_ruang,
                \`desc\`,
                created_at
            FROM room_meeting
            ORDER BY id_room ASC
        `);

        return res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('GET ROOMS ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data room.'
        });
    }
});


//only admin - create room
app.post('/api/rooms/create', requireAdmin, async (req, res) => {
    try {
        const { nama_ruang, desc } = req.body;

        if (!nama_ruang || nama_ruang.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Nama ruangan harus diisi.'
            });
        }

        const [result] = await db.execute(
            `
            INSERT INTO room_meeting
            (
                nama_ruang,
                \`desc\`,
                created_at
            )
            VALUES (?, ?, CURRENT_TIMESTAMP)
            `,
            [
                nama_ruang.trim(),
                desc ? desc.trim() : null
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Ruangan berhasil ditambahkan.',
            data: {
                id_room: result.insertId,
                nama_ruang: nama_ruang.trim()
            }
        });

    } catch (error) {
        console.error('CREATE ROOM ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Gagal menambahkan ruangan.'
        });
    }
});


// delete room - only admin
app.delete('/api/rooms/delete/:id', requireAdmin, async (req, res) => {
    try {
        const idRoom = Number(req.params.id);

        //cek id room hrs int
        if (!Number.isInteger(idRoom)) {
            return res.status(400).json({
                success: false,
                message: 'ID room tidak valid.'
            });
        }

        const [roomRows] = await db.execute(
            `
            SELECT id_room
            FROM room_meeting
            WHERE id_room = ?
            `,
            [idRoom]
        );

        if (roomRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room tidak ditemukan.'
            });
        }

        // Jangan menghapus room jika sudah mempunyai histori booking
        const [bookingRows] = await db.execute(
            `
            SELECT COUNT(*) AS total
            FROM booking_history
            WHERE id_room = ?
            `,
            [idRoom]
        );

        if (Number(bookingRows[0].total) > 0) {
            return res.status(409).json({
                success: false,
                message:
                    'Room tidak dapat dihapus karena masih memiliki histori booking.'
            });
        }

        const [result] = await db.execute(
            `
            DELETE FROM room_meeting
            WHERE id_room = ?
            `,
            [idRoom]
        );

        return res.json({
            success: true,
            message: 'Room berhasil dihapus.',
            affectedRows: result.affectedRows
        });

    } catch (error) {
        console.error('DELETE ROOM ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Gagal menghapus room.'
        });
    }
});


// booking meeting - read
app.get('/api/bookings/meeting/list', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                bh.id_booking,
                bh.id_room,
                rm.nama_ruang,

                bh.id_user,
                ul.username,

                bh.nama_booking,
                bh.tanggal_booking,

                TIME_FORMAT(
                    bh.waktu_mulai,
                    '%H:%i'
                ) AS waktu_mulai,

                TIME_FORMAT(
                    bh.waktu_selesai,
                    '%H:%i'
                ) AS waktu_selesai

            FROM booking_history bh

            INNER JOIN room_meeting rm
                ON rm.id_room = bh.id_room

            INNER JOIN user_login ul
                ON ul.id_user = bh.id_user

            ORDER BY
                bh.tanggal_booking ASC,
                bh.waktu_mulai ASC
        `);

        return res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('GET BOOKINGS ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil jadwal meeting.'
        });
    }
});


// booking meeting - create
app.post('/api/bookings/meeting/create', requireAuth, async (req, res) => {
    try {
        const {
            id_room,
            nama_booking,
            tanggal_booking,
            waktu_mulai,
            waktu_selesai
        } = req.body;

        const idRoom = Number(id_room);

        //validasi input
        if (!Number.isInteger(idRoom)) {
            return res.status(400).json({
                success: false,
                message: 'ID room tidak valid.'
            });
        }

        if (!nama_booking || nama_booking.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Nama meeting harus diisi.'
            });
        }

        if (!isValidDate(tanggal_booking)) {
            return res.status(400).json({
                success: false,
                message: 'Format tanggal harus YYYY-MM-DD.'
            });
        }

        const mulai = timeToMinutes(waktu_mulai);
        const selesai = timeToMinutes(waktu_selesai);

        if (mulai === null || selesai === null) {
            return res.status(400).json({
                success: false,
                message: 'Format waktu harus HH:mm.'
            });
        }

        // cek waktu meeting berdasar hari sama
        if (selesai <= mulai) {
            return res.status(400).json({
                success: false,
                message:
                    'Waktu selesai harus lebih besar dari waktu mulai.'
            });
        }

        const durationMinutes = selesai - mulai;

        //logika durasi meeting
        if (durationMinutes > 480) {
            return res.status(400).json({
                success: false,
                message:
                    'Durasi satu meeting tidak boleh lebih dari 8 jam.'
            });
        }

        // cek avail rooms
        const [roomRows] = await db.execute(
            `
            SELECT id_room
            FROM room_meeting
            WHERE id_room = ?
            `,
            [idRoom]
        );

        if (roomRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room tidak ditemukan.'
            });
        }

        //cek jadwal bentrok
        const conflict = await checkRoomConflict(
            idRoom,
            tanggal_booking,
            waktu_mulai,
            waktu_selesai
        );

        if (conflict) {
            return res.status(409).json({
                success: false,
                message:
                    'Room sudah digunakan pada waktu tersebut.'
            });
        }

        //cek user booking meeting perhari
        const idUser = req.session.user.id_user;

        const currentDailyMinutes =
            await getUserDailyBookingMinutes(
                idUser,
                tanggal_booking
            );

        const newTotalMinutes =
            currentDailyMinutes + durationMinutes;

        if (newTotalMinutes > 480) {
            const remainingMinutes = Math.max(
                0,
                480 - currentDailyMinutes
            );

            return res.status(409).json({
                success: false,
                message:
                    'Booking ditolak. Total penggunaan ruangan oleh user dalam satu hari tidak boleh lebih dari 8 jam.',
                data: {
                    used_minutes: currentDailyMinutes,
                    new_booking_minutes: durationMinutes,
                    remaining_minutes: remainingMinutes
                }
            });
        }

        // pass condition - insert booking
        const [result] = await db.execute(
            `
            INSERT INTO booking_history
            (
                id_room,
                id_user,
                nama_booking,
                tanggal_booking,
                waktu_mulai,
                waktu_selesai
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                idRoom,
                idUser,
                nama_booking.trim(),
                tanggal_booking,
                waktu_mulai,
                waktu_selesai
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Booking berhasil dibuat.',
            data: {
                id_booking: result.insertId,
                id_user: idUser,
                id_room: idRoom,
                nama_booking: nama_booking.trim(),
                tanggal_booking,
                waktu_mulai,
                waktu_selesai
            },
            // redirect: '/booking-schedule.html'
            redirectUrl: '/page/booking-schedule.html'
        });

    } catch (error) {
        console.error('CREATE BOOKING ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Gagal membuat booking.'
        });
    }
});


// update booking - only admin
app.put('/api/bookings/meeting/update/:id', requireAdmin, async (req, res) => {
    try {
        const idBooking = Number(req.params.id);

        if (!Number.isInteger(idBooking)) {
            return res.status(400).json({
                success: false,
                message: 'ID booking tidak valid.'
            });
        }

        const {
            id_room,
            nama_booking,
            tanggal_booking,
            waktu_mulai,
            waktu_selesai
        } = req.body;

        const idRoom = Number(id_room);

        if (!Number.isInteger(idRoom)) {
            return res.status(400).json({
                success: false,
                message: 'ID room tidak valid.'
            });
        }

        if (!nama_booking || nama_booking.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Nama meeting harus diisi.'
            });
        }

        if (!isValidDate(tanggal_booking)) {
            return res.status(400).json({
                success: false,
                message: 'Format tanggal harus YYYY-MM-DD.'
            });
        }

        const mulai = timeToMinutes(waktu_mulai);
        const selesai = timeToMinutes(waktu_selesai);

        if (mulai === null || selesai === null) {
            return res.status(400).json({
                success: false,
                message: 'Format waktu harus HH:mm.'
            });
        }

        if (selesai <= mulai) {
            return res.status(400).json({
                success: false,
                message:
                    'Waktu selesai harus lebih besar dari waktu mulai.'
            });
        }

        const durationMinutes = selesai - mulai;

        if (durationMinutes > 480) {
            return res.status(400).json({
                success: false,
                message:
                    'Durasi meeting tidak boleh lebih dari 8 jam.'
            });
        }

        // Check booking exists
        const [bookingRows] = await db.execute(
            `
            SELECT id_booking
            FROM booking_history
            WHERE id_booking = ?
            `,
            [idBooking]
        );

        if (bookingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking tidak ditemukan.'
            });
        }

        // Check room exists
        const [roomRows] = await db.execute(
            `
            SELECT id_room
            FROM room_meeting
            WHERE id_room = ?
            `,
            [idRoom]
        );

        if (roomRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room tidak ditemukan.'
            });
        }

        // Check conflict except current booking
        const conflict = await checkRoomConflict(
            idRoom,
            tanggal_booking,
            waktu_mulai,
            waktu_selesai,
            idBooking
        );

        if (conflict) {
            return res.status(409).json({
                success: false,
                message:
                    'Room sudah digunakan pada waktu tersebut.'
            });
        }

        const [result] = await db.execute(
            `
            UPDATE booking_history
            SET
                id_room = ?,
                nama_booking = ?,
                tanggal_booking = ?,
                waktu_mulai = ?,
                waktu_selesai = ?
            WHERE id_booking = ?
            `,
            [
                idRoom,
                nama_booking.trim(),
                tanggal_booking,
                waktu_mulai,
                waktu_selesai,
                idBooking
            ]
        );

        return res.json({
            success: true,
            message: 'Jadwal meeting berhasil diubah.',
            affectedRows: result.affectedRows
        });

    } catch (error) {
        console.error('UPDATE BOOKING ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Gagal mengubah jadwal meeting.'
        });
    }
});


// delete booking - only admin
app.delete('/api/bookings/meeting/delete/:id', requireAdmin, async (req, res) => {
    try {
        const idBooking = Number(req.params.id);

        if (!Number.isInteger(idBooking)) {
            return res.status(400).json({
                success: false,
                message: 'ID booking tidak valid.'
            });
        }

        const [result] = await db.execute(
            `
            DELETE FROM booking_history
            WHERE id_booking = ?
            `,
            [idBooking]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking tidak ditemukan.'
            });
        }

        return res.json({
            success: true,
            message: 'Booking berhasil dihapus.'
        });

    } catch (error) {
        console.error('DELETE BOOKING ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Gagal menghapus booking.'
        });
    }
});


// default route - serve login.html
app.get('/', (req, res) => {
    res.sendFile(
        path.join(FE_DIR, 'login.html')
    );
});


app.listen(PORT, () => {
    console.log(
        `Server running at http://localhost:${PORT}`
    );

    console.log(
        `Frontend directory: ${FE_DIR}`
    );
});