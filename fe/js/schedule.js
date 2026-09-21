async function initializeSchedule() {
    const bookingTableBody =
        document.getElementById('bookingTableBody');

    if (!bookingTableBody) {
        return;
    }

    bookingTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                Memuat data...
            </td>
        </tr>
    `;

    try {
        const response = await fetch('/api/bookings/meeting/list');

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || 'Gagal mengambil data booking.'
            );
        }

        renderSchedule(data.data);

    } catch (error) {
        console.error('SCHEDULE ERROR:', error);

        bookingTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    Gagal mengambil data jadwal.
                </td>
            </tr>
        `;
    }
}

function renderSchedule(bookings) {
    const bookingTableBody =
        document.getElementById('bookingTableBody');

    if (!bookings || bookings.length === 0) {
        bookingTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    Belum ada jadwal booking.
                </td>
            </tr>
        `;

        return;
    }

    bookingTableBody.innerHTML = bookings.map(booking => `
        <tr>
            <td>${booking.nama_ruang}</td>
            <td>${booking.nama_booking}</td>
            <td>${formatDate(booking.tanggal_booking)}</td>
            <td>${booking.waktu_mulai}</td>
            <td>${booking.waktu_selesai}</td>
            <td>${booking.username}</td>
        </tr>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}