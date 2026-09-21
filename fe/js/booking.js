let currentCalendarDate = new Date();
let calendarBookings = [];
let selectedDateStr = null;

async function initializeBooking() {

    console.log('initializeBooking() dipanggil');

    const roomSelect = document.getElementById('room');
    const bookingForm = document.getElementById('bookingForm');

    if (!roomSelect || !bookingForm) {
        console.error(
            'Element booking tidak ditemukan.'
        );

        return;
    }

    // event calendar navigation buttons
    document.getElementById('prevMonthBtn').onclick = () => changeMonth(-1);
    document.getElementById('nextMonthBtn').onclick = () => changeMonth(1);
    document.getElementById('todayBtn').onclick = () => {
        currentCalendarDate = new Date();
        loadCalendarBookings();
    };


    await Promise.all([
        loadRooms(),
        loadCalendarBookings()
    ]);

    bookingForm.addEventListener('submit',handleBookingSubmit);

}

// Ambil data booking dari API server untuk ditampilkan di kalender
async function loadCalendarBookings() {
    try {
        const response = await fetch('/api/bookings/meeting/list');
        const data = await response.json();

        if (response.ok && data.success) {
            calendarBookings = data.data;
        } else {
            calendarBookings = [];
        }
    } catch (error) {
        console.error('Gagal memuat jadwal kalender:', error);
        calendarBookings = [];
    }

    renderCalendar();
}

// Navigasi bulan kalender
function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

// Render tampilan kalender
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarMonthYear = document.getElementById('calendarMonthYear');
    if (!calendarGrid || !calendarMonthYear) return;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Nama bulan Indonesia
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    calendarMonthYear.textContent = `${monthNames[month]} ${year}`;

    // Perhitungan tanggal
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayStr = formatDateToYYYYMMDD(new Date());
    calendarGrid.innerHTML = '';

    // 1. Render Hari Bulan Sebelumnya (padding)
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const prevDate = daysInPrevMonth - i;
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell other-month';
        cell.innerHTML = `<span class="date-number text-muted">${prevDate}</span>`;
        calendarGrid.appendChild(cell);
    }

    // 2. Render Hari Bulan Ini
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateStr = formatDateToYYYYMMDD(dateObj);

        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        if (dateStr === todayStr) cell.classList.add('is-today');
        if (dateStr === selectedDateStr) cell.classList.add('is-selected');

        // Filter booking yang ada pada tanggal ini
        const dayBookings = calendarBookings.filter(b => {
            const bDate = typeof b.tanggal_booking === 'string' 
                ? b.tanggal_booking.substring(0, 10) 
                : formatDateToYYYYMMDD(new Date(b.tanggal_booking));
            return bDate === dateStr;
        });

        let badgesHTML = '';
        dayBookings.forEach(b => {
            badgesHTML += `
                <span class="event-badge bg-primary text-white" title="${b.nama_ruang}: ${b.nama_booking}">
                    <strong>${b.waktu_mulai}</strong> ${b.nama_ruang}
                </span>
            `;
        });

        cell.innerHTML = `
            <span class="date-number">${day}</span>
            <div class="events-wrapper overflow-hidden">${badgesHTML}</div>
        `;

        // Klik tanggal untuk melihat detail & mengisi form
        cell.addEventListener('click', () => {
            selectDate(dateStr, dayBookings);
        });

        calendarGrid.appendChild(cell);
    }

    // 3. Render Hari Bulan Berikutnya (padding sisa grid)
    const totalCells = firstDayOfMonth + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell other-month';
        cell.innerHTML = `<span class="date-number text-muted">${day}</span>`;
        calendarGrid.appendChild(cell);
    }
}

// Menangani klik tanggal pada kalender
function selectDate(dateStr, dayBookings) {
    selectedDateStr = dateStr;
    renderCalendar();

    // Otomatis isi tanggal pada form booking di bawahnya
    const bookingDateInput = document.getElementById('bookingDate');
    if (bookingDateInput) {
        bookingDateInput.value = dateStr;
    }

    // Tampilkan container detail kegiatan
    const detailContainer = document.getElementById('selectedDateDetail');
    const detailTitle = document.getElementById('selectedDateTitle');
    const eventsList = document.getElementById('selectedDateEventsList');

    detailContainer.style.display = 'block';

    // Format tanggal Indonesia untuk judul detail
    const [y, m, d] = dateStr.split('-');
    detailTitle.textContent = `Jadwal Kegiatan Tanggal ${d}-${m}-${y}`;

    if (dayBookings.length === 0) {
        eventsList.innerHTML = `
            <p class="text-success mb-0">
                <i class="bi bi-check-circle"></i> Tidak ada kegiatan pada tanggal ini. Ruangan tersedia!
            </p>
        `;
    } else {
        eventsList.innerHTML = dayBookings.map(b => `
            <div class="card mb-2 border-start border-4 border-primary shadow-sm">
                <div class="card-body p-2 px-3 d-flex justify-content-between align-items-center flex-wrap">
                    <div>
                        <span class="badge bg-info text-dark me-1">${b.nama_ruang}</span>
                        <strong>${b.nama_booking}</strong>
                        <small class="text-muted d-block">Dibooking oleh: ${b.username}</small>
                    </div>
                    <div class="text-end fw-bold text-primary">
                        ${b.waktu_mulai} - ${b.waktu_selesai} WIB
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Helper Format Tanggal YYYY-MM-DD
function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


async function loadRooms() {

    console.log('loadRooms() dipanggil');

    const roomSelect =
        document.getElementById('room');

    if (!roomSelect) {

        console.error(
            'Element #room tidak ditemukan.'
        );

        return;
    }

    roomSelect.innerHTML = `
        <option value="">
            Memuat ruangan...
        </option>
    `;

    try {

        console.log(
            'Request GET /api/rooms'
        );

        const response =
            await fetch('/api/rooms');

        console.log(
            'Response status:',
            response.status
        );

        const data =
            await response.json();

        console.log(
            'Response data:',
            data
        );

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                'Gagal mengambil data ruangan.'
            );
        }

        roomSelect.innerHTML = `
            <option value="">
                -- Pilih Ruangan --
            </option>
        `;

        data.data.forEach(room => {

            const option =
                document.createElement('option');

            option.value =
                room.id_room;

            option.textContent =
                room.nama_ruang;

            roomSelect.appendChild(option);

        });

        console.log(
            'Data ruangan berhasil ditampilkan.'
        );

    } catch (error) {

        console.error(
            'LOAD ROOM ERROR:',
            error
        );

        roomSelect.innerHTML = `
            <option value="">
                Gagal mengambil data ruangan
            </option>
        `;
    }
}


async function handleBookingSubmit(event) {

    event.preventDefault();

    console.log(
        'Form booking disubmit.'
    );

    const roomId =
        document.getElementById('room').value;

    const namaBooking =
        document.getElementById('bookingName').value;

    const tanggal =
        document.getElementById('bookingDate').value;

    const waktuMulai =
        document.getElementById('startTime').value;

    const waktuSelesai =
        document.getElementById('endTime').value;

    // const [year, month, day] = tanggal.split('-');
    // const tanggalFormat = `${day}-${month}-${year}`;

    console.log({
        roomId,
        namaBooking,
        tanggal,
        waktuMulai,
        waktuSelesai
    });


    if (
        !roomId ||
        !namaBooking ||
        !tanggal ||
        !waktuMulai ||
        !waktuSelesai
    ) {

        alert(
            'Semua data harus diisi.'
        );

        return;
    }


    if (waktuMulai >= waktuSelesai) {

        alert(
            'Waktu selesai harus lebih besar dari waktu mulai.'
        );

        return;
    }


    try {

        console.log(
            'Mengirim booking ke server...'
        );

        const response =
            await fetch(
                '/api/bookings/meeting/create',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        id_room: roomId,
                        nama_booking:
                            namaBooking,
                        tanggal_booking:
                            tanggal,
                        waktu_mulai:
                            waktuMulai,
                        waktu_selesai:
                            waktuSelesai
                    })
                }
            );


        console.log(
            'Booking response status:',
            response.status
        );


        const data = await response.json();
        console.log( 'Booking response:', data);


        if (!response.ok || !data.success) {
            alert( data.message || 'Booking gagal dilakukan.');
            return;
        }

        alert('Booking berhasil dibuat.');
        document.getElementById('bookingForm').reset();

        // Muat ulang daftar ruangan
        // jika diperlukan
        await loadRooms();

        loadPage('schedule');


    } catch (error) {

        console.error(
            'BOOKING ERROR:',
            error
        );

        alert(
            'Tidak dapat terhubung ke server.'
        );
    }
}