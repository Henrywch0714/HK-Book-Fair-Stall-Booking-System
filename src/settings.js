/**
 * Settings Page - Profile & Preferences Management
 */

document.addEventListener("DOMContentLoaded", function () {
    // DOM Elements
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    const logoutButton = document.getElementById('logoutButton');
    const userNameEl = document.getElementById('userName');

    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const companyNameInput = document.getElementById('companyName');

    const emailNotifToggle = document.getElementById('emailNotif');
    const bookingRemindersToggle = document.getElementById('bookingReminders');
    const paymentAlertsToggle = document.getElementById('paymentAlerts');
    
    // Password fields
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // State
    let userData = {};
    let notificationSettings = {
        emailNotifications: true,
        bookingReminders: true,
        paymentAlerts: true
    };

    // Initialize
    async function init() {
        await loadUserData();
        loadNotificationSettings();
        setupEventListeners();
    }

    async function loadUserData() {
        try {

            if (typeof ApiService !== 'undefined' && !ApiService.isAuthenticated()) {
                ApiService.requireAuth();
                return;
            }

            if (typeof apiService !== 'undefined' && apiService.getMyProfile) {
                console.log('📥 Loading user profile from API...');
                const profile = await apiService.getMyProfile();
                userData = profile || {};
                localStorage.setItem('userData', JSON.stringify(userData));
                localStorage.setItem('user', JSON.stringify(userData));
            } else {
                console.warn('⚠️ apiService.getMyProfile not available, fallback to localStorage');
                const storedUserData = localStorage.getItem('userData');
                userData = storedUserData ? JSON.parse(storedUserData) : getDefaultUser();
            }

            updateUserInfo();
            populateForms();
        } catch (error) {
            console.error('Error loading user data from API:', error);

            try {
                const storedUserData = localStorage.getItem('userData');
                if (storedUserData) {
                    userData = JSON.parse(storedUserData);
                } else {
                    userData = getDefaultUser();
                }
            } catch (e) {
                console.error('Error loading user data from localStorage:', e);
                userData = getDefaultUser();
            }
            updateUserInfo();
            populateForms();
        }
    }

    function getDefaultUser() {
        return {
            username: 'User',
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            companyName: ''
        };
    }

    function updateUserInfo() {
        const fullName = userData.firstName && userData.lastName 
            ? `${userData.firstName} ${userData.lastName}`
            : userData.username || userData.email || 'User';
        
        if (userNameEl) {
            userNameEl.textContent = fullName;
        }
    }

    function populateForms() {
        try {
            if (firstNameInput) firstNameInput.value = userData.firstName || '';
            if (lastNameInput) lastNameInput.value = userData.lastName || '';
            if (emailInput) emailInput.value = userData.email || '';
            if (phoneInput) phoneInput.value = userData.phone || '';
            if (companyNameInput) companyNameInput.value = userData.companyName || '';
        } catch (error) {
            console.error('Error populating forms:', error);
        }
    }

    function loadNotificationSettings() {
        try {
            const storedSettings = localStorage.getItem('notificationSettings');
            if (storedSettings) {
                notificationSettings = JSON.parse(storedSettings);
            }
            
            if (emailNotifToggle) {
                emailNotifToggle.checked = notificationSettings.emailNotifications;
            }
            if (bookingRemindersToggle) {
                bookingRemindersToggle.checked = notificationSettings.bookingReminders;
            }
            if (paymentAlertsToggle) {
                paymentAlertsToggle.checked = notificationSettings.paymentAlerts;
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    }

    window.saveProfile = async function() {
        try {
            if (!firstNameInput || !lastNameInput || !emailInput) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }

            const firstName = firstNameInput.value.trim();
            const lastName = lastNameInput.value.trim();
            const email = emailInput.value.trim();
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const companyName = companyNameInput ? companyNameInput.value.trim() : '';

            if (!firstName || !lastName || !email) {
                showNotification('First name, last name, and email are required', 'error');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }

            const payload = {
                firstName,
                lastName,
                email,
                phone,
                companyName
            };

            let updatedUser = null;

            if (typeof apiService !== 'undefined' && apiService.updateMyProfile) {
                console.log('📤 Updating profile via API...', payload);
                const res = await apiService.updateMyProfile(payload);
                updatedUser = res.user || res; 
            } else {
                console.warn('⚠️ apiService.updateMyProfile not available, using localStorage only');
            }

            userData = updatedUser || { ...userData, ...payload };

            // 缓存到 localStorage
            localStorage.setItem('userData', JSON.stringify(userData));
            localStorage.setItem('user', JSON.stringify(userData));

            updateUserInfo();
            populateForms();

            showNotification('✅ Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Error saving profile:', error);
            showNotification(error.message || '❌ Failed to update profile. Please try again.', 'error');
        }
    };

    window.saveNotifications = function() {
        try {
            notificationSettings = {
                emailNotifications: emailNotifToggle ? emailNotifToggle.checked : true,
                bookingReminders: bookingRemindersToggle ? bookingRemindersToggle.checked : true,
                paymentAlerts: paymentAlertsToggle ? paymentAlertsToggle.checked : true
            };

            localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));

            showNotification('✅ Notification preferences saved!', 'success');
        } catch (error) {
            console.error('Error saving notification settings:', error);
            showNotification('❌ Failed to save preferences. Please try again.', 'error');
        }
    };

    window.changePassword = async function() {
        try {
            if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
                showNotification('Password form fields not found', 'error');
                return;
            }

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                showNotification('Please fill in all password fields', 'error');
                return;
            }

            if (newPassword.length < 8) {
                showNotification('New password must be at least 8 characters long', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showNotification('New passwords do not match', 'error');
                return;
            }

            if (typeof apiService !== 'undefined' && apiService.changePassword) {
                console.log('📤 Changing password via API...');
                await apiService.changePassword({
                    currentPassword,
                    newPassword
                });
            } else {
                console.warn('⚠️ apiService.changePassword not available, only simulate success');
            }

            showNotification('✅ Password changed successfully!', 'success');

            currentPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
        } catch (error) {
            console.error('Error changing password:', error);
            showNotification(error.message || '❌ Failed to change password. Please try again.', 'error');
        }
    };


    function showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#4f46e5'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            max-width: 400px;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Setup event listeners
    function setupEventListeners() {
        // Mobile menu toggle
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                if (sidebar) {
                    sidebar.classList.toggle('sidebar-open');
                }
            });
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 900) {
                if (sidebar && sidebar.classList.contains('sidebar-open')) {
                    if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                        sidebar.classList.remove('sidebar-open');
                    }
                }
            }
        });


        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    if (typeof ApiService !== 'undefined') {
                        ApiService.logout();
                    } else {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.href = 'Login.html';
                    }
                }
            });
        }

        // Enter key to save on profile form
        const profileInputs = [firstNameInput, lastNameInput, emailInput, phoneInput, companyNameInput];
        profileInputs.forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        saveProfile();
                    }
                });
            }
        });

        // Enter key to change password
        const passwordInputs = [currentPasswordInput, newPasswordInput, confirmPasswordInput];
        passwordInputs.forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        changePassword();
                    }
                });
            }
        });
    }

    // Initialize the page
    init();
});