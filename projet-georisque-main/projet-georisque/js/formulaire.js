document.getElementById('myForm').addEventListener('submit', function (event){
    event.preventDefault();

    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    if (validateEmail(email) && validatePassword(password)) {

        window.location.href = profil.html;
    } else {
        alert('Veuillez entrer un email et un mot de passe valides.');
    }
});

function validateEmail(email) {
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    var re = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return re.test(password);
}