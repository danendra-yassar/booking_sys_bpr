async function initializeBooking() {

    console.log('initializeBooking() dipanggil');

    const roomSelect = document.getElementById('room');
    const bookingForm = document.getElementById('bookingForm');

    console.log('roomSelect:', roomSelect);
    console.log('bookingForm:', bookingForm);

    if (!roomSelect || !bookingForm) {

        console.error(
            'Element booking tidak ditemukan.'
        );

        return;
    }

    console.log('Memanggil loadRooms()...');

    await loadRooms();

    bookingForm.addEventListener(
        'submit',
        handleBookingSubmit
    );

    console.log(
        'Event submit booking berhasil dipasang.'
    );
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


        initializeSchedule();


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