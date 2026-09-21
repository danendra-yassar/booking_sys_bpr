async function initializeAdminBooking() {
    const bookingList =
        document.getElementById('bookingList');

    if (!bookingList) {
        return;
    }

    await loadAdminBookings();
}

async function loadAdminBookings() {
    const bookingList =
        document.getElementById('bookingList');

    bookingList.innerHTML = `
        <p class="text-muted">
            Memuat data booking...
        </p>
    `;

    try {
        const response =
            await fetch('/api/bookings/meeting/list');

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                'Gagal mengambil data booking.'
            );
        }

        if (data.data.length === 0) {
            bookingList.innerHTML = `
                <p class="text-muted">
                    Belum ada booking.
                </p>
            `;

            return;
        }

        bookingList.innerHTML = `
            <div class="table-responsive">

                <table class="table table-bordered table-hover">

                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Ruangan</th>
                            <th>Nama Booking</th>
                            <th>User</th>
                            <th>Tanggal</th>
                            <th>Mulai</th>
                            <th>Selesai</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${data.data.map((booking, index) => `
                            <tr>

                                <td>${index + 1}</td>

                                <td>
                                    ${booking.nama_ruang}
                                </td>

                                <td>
                                    ${booking.nama_booking}
                                </td>

                                <td>
                                    ${booking.username}
                                </td>

                                <td>
                                    ${formatDate(booking.tanggal_booking)}
                                </td>

                                <td>
                                    ${booking.waktu_mulai}
                                </td>

                                <td>
                                    ${booking.waktu_selesai}
                                </td>

                                <td>

                                    <button
                                        class="btn btn-sm btn-danger"
                                        onclick="deleteBooking(${booking.id_booking})">
                                        Hapus
                                    </button>

                                </td>

                            </tr>
                        `).join('')}

                    </tbody>

                </table>

            </div>
        `;

    } catch (error) {
        console.error(
            'ADMIN BOOKING ERROR:',
            error
        );

        bookingList.innerHTML = `
            <div class="alert alert-danger">
                Gagal mengambil data booking.
            </div>
        `;
    }
}

async function deleteBooking(id) {

    const confirmDelete = confirm(
        'Apakah Anda yakin ingin menghapus booking ini?'
    );

    if (!confirmDelete) {
        return;
    }

    try {
        const response = await fetch(
            `/api/bookings/meeting/delete/${id}`,
            {
                method: 'DELETE'
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(
                data.message ||
                'Gagal menghapus booking.'
            );

            return;
        }

        alert('Booking berhasil dihapus.');

        await loadAdminBookings();

    } catch (error) {
        console.error(
            'DELETE BOOKING ERROR:',
            error
        );

        alert(
            'Tidak dapat terhubung ke server.'
        );
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}