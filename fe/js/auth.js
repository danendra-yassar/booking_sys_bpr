async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = '/page/login.html';
        } else {
            alert(data.message || 'Logout gagal.');
        }

    } catch (error) {
        console.error('LOGOUT ERROR:', error);
        alert('Tidak dapat terhubung ke server.');
    }
}

document.getElementById('logoutButton').addEventListener('click', function () {
    logout();
});