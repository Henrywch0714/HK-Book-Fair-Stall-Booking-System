document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("registerForm");

    if (!registerForm) {
        return;
    }

    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const firstName = registerForm.firstName.value.trim();
        const lastName = registerForm.lastName.value.trim();
        const email = registerForm.email.value.trim();
        const phone = registerForm.phone.value.trim();
        const companyName = registerForm.companyName.value.trim();
        const industry = registerForm.industry.value;
        const companySize = registerForm.companySize.value;
        const companyAddress = registerForm.companyAddress.value.trim();
        const password = registerForm.password.value;
        const confirmPassword = registerForm.confirmPassword.value;
        const agreeTerms = registerForm.agreeTerms.checked;


        if (!firstName || !lastName || !email || !phone || !companyName || !industry || !password || !confirmPassword) {
            alert("Please fill in all required fields marked with *.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Password and Confirm Password do not match.");
            return;
        }

        if (!agreeTerms) {
            alert("You must agree to the Terms of Service and Privacy Policy.");
            return;
        }

        try {
            const userData = {
                firstName,
                lastName,
                email,
                phone,
                companyName,
                industry,
                companySize,
                companyAddress,
                password,
                role: "exhibitor" 
            };

            const result = await apiService.register(userData);
            
            alert("Registration successful! You can now login with your credentials.");

            window.location.href = "../webContent/Login.html";
            
        } catch (error) {
            console.error('Registration failed:', error);
            alert("Registration failed. Please try again.");
        }
    });
});