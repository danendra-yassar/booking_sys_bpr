let currentUser = null;

const pageMap = {
    dashboard: '/page/dashboard.html',
    schedule: '/page/booking-schedule.html',
    booking: '/page/booking-history.html',
    'admin-room': '/page/admin-room.html',
    'admin-booking': '/page/admin-booking.html'
};

const contentArea = document.getElementById('contentArea');

async function checkLogin() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (!response.ok || !data.success) {
            window.location.href = '/page/login.html';
            return;
        }

        currentUser = data.user;

        document.getElementById('usernameDisplay').textContent =
            currentUser.username;

        document.getElementById('roleDisplay').textContent =
            '(' + currentUser.role + ')';

        // Tampilkan menu admin jika role admin
        if (currentUser.role === 'admin') {
            document.getElementById('adminMenu').style.display = 'block';
        }

        // Load dashboard pertama kali
        loadPage('dashboard');

    } catch (error) {
        console.error('SESSION ERROR:', error);
        window.location.href = '/page/login.html';
    }
}

async function loadPage(page) {
    const pageUrl = pageMap[page];

    if (!pageUrl) {
        console.error('Halaman tidak ditemukan:', page);
        return;
    }

    // Cegah user biasa membuka halaman admin
    if (
        (page === 'admin-room' || page === 'admin-booking') &&
        currentUser.role !== 'admin'
    ) {
        alert('Anda tidak memiliki akses ke halaman ini.');
        return;
    }

    try {
        contentArea.innerHTML = `
            <p class="text-muted">Memuat halaman...</p>
        `;

        const response = await fetch(pageUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();

        contentArea.innerHTML = html;

        // Update menu aktif
        document.querySelectorAll('.menu-button').forEach(button => {
            button.classList.remove('active');
        });

        const selectedButton = document.querySelector(
            `.menu-button[data-page="${page}"]`
        );

        if (selectedButton) {
            selectedButton.classList.add('active');
        }

        // Jalankan JS sesuai halaman
        initializePage(page);

    } catch (error) {
        console.error('LOAD PAGE ERROR:', error);

        contentArea.innerHTML = `
            <div class="alert alert-danger">
                Gagal memuat halaman.
            </div>
        `;
    }
}

function initializePage(page) {
    switch (page) {
        case 'dashboard':
            // initializeDashboard();
            break;

        case 'schedule':
            initializeSchedule();
            break;

        case 'booking':
            initializeBooking();
            break;

        case 'admin-room':
            initializeAdminRoom();
            break;

        case 'admin-booking':
            initializeAdminBooking();
            break;
    }
}

// Event menu sidebar
document.querySelectorAll('.menu-button').forEach(button => {
    button.addEventListener('click', function () {
        const page = this.dataset.page;

        loadPage(page);
    });
});

// Mulai aplikasi
document.addEventListener('DOMContentLoaded', function () {
    checkLogin();
});