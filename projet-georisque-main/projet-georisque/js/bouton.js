document.addEventListener('DOMContentLoaded', function() {
    var dropdownButtons = document.querySelectorAll('.dropdown-button');

    dropdownButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            var content = this.nextElementSibling;
            content.style.display = (content.style.display === 'block') ? 'none' : 'block';
        });
    });

    loadProfileData();
});

function editInfo(field) {
    var form = document.getElementById('edit-form');
    var label = document.getElementById('edit-label');
    var input = document.getElementById('edit-input');

    switch(field) {
        case 'email':
            label.textContent = 'Nouvel Email:';
            input.type = 'email';
            break;
        case 'nom':
            label.textContent = 'Nouveau Nom:';
            input.type = 'text';
            break;
        case 'prenom':
            label.textContent = 'Nouveau Prénom:';
            input.type = 'text';
            break;
        case 'pays':
            label.textContent = 'Nouveau Pays d\'Origine:';
            input.type = 'text';
            break;
        case 'departement':
            label.textContent = 'Nouveau Département:';
            input.type = 'text';
            break;
    }
    form.style.display = 'block';

    form.onsubmit = function(event) {
        event.preventDefault();
        saveProfileData(field, input.value);
        form.style.display = 'none';
        input.value = ''; // Réinitialiser le champ après enregistrement
        loadProfileData();  // Recharger les données pour afficher les changements
    };
}



function saveProfileData(field, value) {
    localStorage.setItem(field, value);
    alert(field + ' mis à jour avec succès!');
}

function loadProfileData() {
    var fields = ['email', 'nom', 'prenom', 'pays', 'departement'];
    fields.forEach(function(field) {
        var value = localStorage.getItem(field);
        if (value) {
            var displayField = document.getElementById('profile-' + field);
            if (displayField) {
                displayField.textContent = field.charAt(0).toUpperCase() + field.slice(1) + ': ' + value;
            } else {
                var p = document.createElement('p');
                p.id = 'profile-' + field;
                p.textContent = field.charAt(0).toUpperCase() + field.slice(1) + ': ' + value;
                document.querySelector('.profile-container').appendChild(p);
            }
        }
    });
}
