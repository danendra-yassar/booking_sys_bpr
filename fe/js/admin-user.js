async function initializeListUsers() {
    const userList = document.getElementById('userList');

    if (!userList) {
        return;
    }

    await loadAdminUsers();

    const form = document.getElementById('userForm');

    if (form) {
        form.addEventListener('submit', handleAddUser);
    }
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    
    const date = new Date(isoString);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function loadAdminUsers() {
    const userList = document.getElementById('userList');

    userList.innerHTML = `
        <p class="text-muted">
            Memuat data user...
        </p >
    `;

    try {

        console.log(
            'Request GET /api/users'
        );

        const response = await fetch('/api/users');

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || 'Gagal mengambil data user.'
            );
        }

        if (data.data.length === 0) {
            userList.innerHTML = `
                <p class="text-muted">
                    Belum ada user.
                </p>
            `;

            return;
        }

        userList.innerHTML = data.data.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.role === 'admin' ? 'Admin' : 'User'}</td>
                <td>${formatDateTime(user.create_at)}</td>
                <td>
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="deleteUser(${user.id_user})">
                        Hapus
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('ADMIN USER ERROR:', error);

        userList.innerHTML = `
            <div class="alert alert-danger">
                Gagal mengambil data user.
            </div>
        `;
    }
}

async function handleAddUser(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    if (!username) {
        alert('Username harus diisi.');
        return;
    }

    if (!password) {
        alert('Password harus diisi.');
        return;
    }

    try {
        const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                role: role
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(
                data.message ||
                'Gagal menambahkan user.'
            );

            return;
        }

        alert('User berhasil ditambahkan.');

        document.getElementById('userForm').reset();

        await loadAdminUsers();

    } catch (error) {
        console.error('ADD USER ERROR:', error);

        alert('Tidak dapat terhubung ke server.');
    }
}

async function deleteUser(id) {
    const confirmDelete =
        confirm('Apakah Anda yakin ingin menghapus user ini?');

    if (!confirmDelete) {
        return;
    }

    try {
        const response = await fetch(
            `/api/users/delete/${id}`,
            {
                method: 'DELETE'
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(
                data.message ||
                'Gagal menghapus user.'
            );

            return;
        }

        alert('User berhasil dihapus.');

        await loadAdminUsers();

    } catch (error) {
        console.error('DELETE USER ERROR:', error);

        alert('Tidak dapat terhubung ke server.');
    }
}   