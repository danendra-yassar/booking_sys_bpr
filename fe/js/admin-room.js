async function initializeAdminRoom() {
    const roomList = document.getElementById('roomList');

    if (!roomList) {
        return;
    }

    await loadAdminRooms();

    const form = document.getElementById('roomForm');

    if (form) {
        form.addEventListener('submit', handleAddRoom);
    }
}

async function loadAdminRooms() {
    const roomList = document.getElementById('roomList');

    roomList.innerHTML = `
        <p class="text-muted">
            Memuat data ruangan...
        </p>
    `;

    try {
        const response = await fetch('/api/rooms');

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || 'Gagal mengambil data ruangan.'
            );
        }

        if (data.data.length === 0) {
            roomList.innerHTML = `
                <p class="text-muted">
                    Belum ada ruangan.
                </p>
            `;

            return;
        }

        roomList.innerHTML = data.data.map(room => `
            <div class="dashboard-card">

                <div class="d-flex justify-content-between align-items-center">

                    <div>
                        <h5>${room.nama_ruang}</h5>
                        <p>${room.desc || '-'}</p>
                    </div>

                    <button
                        class="btn btn-sm btn-danger"
                        onclick="deleteRoom(${room.id_room})">
                        Hapus
                    </button>

                </div>

            </div>
        `).join('');

    } catch (error) {
        console.error('ADMIN ROOM ERROR:', error);

        roomList.innerHTML = `
            <div class="alert alert-danger">
                Gagal mengambil data ruangan.
            </div>
        `;
    }
}

async function handleAddRoom(event) {
    event.preventDefault();

    const namaRuang =
        document.getElementById('namaRuang').value;

    const deskripsi =
        document.getElementById('deskripsiRuang').value;

    if (!namaRuang) {
        alert('Nama ruangan harus diisi.');
        return;
    }

    try {
        const response = await fetch('/api/rooms/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nama_ruang: namaRuang,
                desc: deskripsi
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(
                data.message ||
                'Gagal menambahkan ruangan.'
            );

            return;
        }

        alert('Ruangan berhasil ditambahkan.');

        document.getElementById('roomForm').reset();

        await loadAdminRooms();

    } catch (error) {
        console.error('ADD ROOM ERROR:', error);

        alert('Tidak dapat terhubung ke server.');
    }
}

async function deleteRoom(id) {
    const confirmDelete =
        confirm('Apakah Anda yakin ingin menghapus ruangan ini?');

    if (!confirmDelete) {
        return;
    }

    try {
        const response = await fetch(
            `/api/rooms/delete/${id}`,
            {
                method: 'DELETE'
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(
                data.message ||
                'Gagal menghapus ruangan.'
            );

            return;
        }

        alert('Ruangan berhasil dihapus.');

        await loadAdminRooms();

    } catch (error) {
        console.error('DELETE ROOM ERROR:', error);

        alert('Tidak dapat terhubung ke server.');
    }
}   