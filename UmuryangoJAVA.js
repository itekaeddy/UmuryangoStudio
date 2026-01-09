let photos = [];

// === AUTH SYSTEM ===
let users = JSON.parse(localStorage.getItem("users")) || [];
if (!users.find(u => u.email === "gerant@umuryango.com")) {
    users.push({name:"Gérant",email:"gerant@umuryango.com",password:"admin123",role:"gerant",validated:true});
    localStorage.setItem("users", JSON.stringify(users));
}
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;

function showRegister(){
    loginPage.classList.add('hidden');
    registerPage.classList.remove('hidden');
}

function showLogin(){
    registerPage.classList.add('hidden');
    loginPage.classList.remove('hidden');
}

function register(){
    const name = regName.value;
    const email = regEmail.value;
    const password = regPassword.value;
    
    if(users.find(u => u.email === email)) {
        return alert("Email déjà utilisé");
    }
    
    users.push({name, email, password, role:"employe", validated:false});
    localStorage.setItem("users", JSON.stringify(users));
    alert("Compte créé — en attente de validation");
    showLogin();
}

function login(){
    const email = loginEmail.value;
    const password = loginPassword.value;
    const user = users.find(u => u.email === email && u.password === password);
    
    if(!user) return alert("Identifiants incorrects");
    if(!user.validated) return alert("Compte non validé");
    
    currentUser = user;
    localStorage.setItem("currentUser", JSON.stringify(user));
    loadDashboard();
}

function logout(){
    currentUser = null;
    localStorage.removeItem("currentUser");
    location.reload();
}

function loadDashboard(){
    loginPage.classList.add('hidden');
    registerPage.classList.add('hidden');
    dashboard.classList.remove('hidden');
    
    roleInfo.innerHTML = `Connecté en tant que : ${currentUser.name} (${currentUser.role}) 
        <button onclick="logout()" style="display:block; margin:10px auto 0;     background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;     width: 20%;
    padding: 14px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    margin-top: 10px;">
    Déconnexion
</button>`;
    
    if(currentUser.role === "gerant"){
        userManagement.classList.remove('hidden');
        loadUsersTable();
    }
    
    // Charger les photos APRÈS l'authentification
    loadPhotos();
}

function loadUsersTable(){
    let html = '<tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Validation</th></tr>';
    users.forEach((u, i) => {
        html += `<tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td>
                ${u.role === "gerant" ? "—" : `
                    <button onclick="validateUser(${i})">${u.validated ? "Validé" : "Valider"}</button>
                    ${u.validated ? `<button onclick="revokeAccess(${i})">Révoquer</button>` : ""}
                `}
            </td>
        </tr>`;
    });
    usersTable.innerHTML = html;
}

function validateUser(i){
    users[i].validated = true;
    localStorage.setItem("users", JSON.stringify(users));
    loadUsersTable();
}

function revokeAccess(i){
    if(confirm(`Êtes-vous sûr de vouloir révoquer l'accès de ${users[i].name} ?`)){
        users[i].validated = false;
        localStorage.setItem("users", JSON.stringify(users));
        loadUsersTable();
    }
}

// === PHOTO MANAGEMENT ===

function loadPhotos() {
    const stored = localStorage.getItem('photoManagement');
    if (stored) {
        photos = JSON.parse(stored);
    }
    updateDisplay();
}

function savePhotos() {
    localStorage.setItem('photoManagement', JSON.stringify(photos));
}

// Initialiser les événements seulement quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    if(document.getElementById('photoForm')) {
        document.getElementById('photoForm').addEventListener('submit', function(e) {
            e.preventDefault();
          const owner = document.getElementById('ownerName').value; 
          const clientNumber = document.getElementById('clientNumber').value; 
          const count = parseInt(document.getElementById('photoCount').value);
          const amount = parseFloat(document.getElementById('clientAmount').value) || 0;

            const newPhoto = {
                id: Date.now(),
                clientNumber: clientNumber,   // ✅ AJOUT ICI
                owner: owner,
                count: count,
                amount: amount,      // ✅ Montant payé ajouté
                status: 'pending',
                processedBy: null,
                processedDate: null,
                addedDate: new Date().toLocaleString('fr-FR')
            };

            photos.push(newPhoto);
            savePhotos();
            updateDisplay();

            document.getElementById('photoForm').reset();
            alert('Photos ajoutées avec succès !');
        });
    }

    if(document.getElementById('processForm')) {
        document.getElementById('processForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const processor = document.getElementById('processorName').value;
            const photoId = parseInt(document.getElementById('photoSelect').value);

            const photo = photos.find(p => p.id === photoId);
            if (photo) {
                photo.status = 'processed';
                photo.processedBy = processor;
                photo.processedDate = new Date().toLocaleString('fr-FR');
                savePhotos();
                updateDisplay();

                document.getElementById('processForm').reset();
                alert('Photo marquée comme traitée !');
            }
        });
    }
    
    // Charger le dashboard si l'utilisateur est déjà connecté
    if (currentUser) {
        loadDashboard();
    }
});

function updateDisplay() {
    const totalCount = photos.reduce((sum, p) => sum + p.count, 0);
    const pendingCount = photos.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.count, 0);
    const processedCount = photos.filter(p => p.status === 'processed').reduce((sum, p) => sum + p.count, 0);

    document.getElementById('totalPhotos').textContent = totalCount;
    document.getElementById('pendingPhotos').textContent = pendingCount;
    document.getElementById('processedPhotos').textContent = processedCount;

    renderPhotoList('allPhotos', photos);
    renderPhotoList('pendingPhotos', photos.filter(p => p.status === 'pending'));
    renderPhotoList('processedPhotos', photos.filter(p => p.status === 'processed'));

    updatePhotoSelect();
}

function renderPhotoList(containerId, photoList) {
    const container = document.getElementById(containerId);
    
    if (photoList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                </svg>
                <p>Aucune photo à afficher</p>
            </div>
        `;
        return;
    }

    container.innerHTML = photoList.map(photo => `
        <div class="photo-item">
            <div class="photo-header">
                <div class="photo-info">
                    <div class="photo-owner">${photo.owner}</div>
                       <div class="client-number">Client n° ${photo.clientNumber}</div>
                    <div class="photo-count">${photo.count} photo${photo.count > 1 ? 's' : ''} • Montant: ${photo.amount} FBU • Ajouté le ${photo.addedDate}</div>
                </div>
                <span class="photo-status ${photo.status === 'pending' ? 'status-pending' : 'status-processed'}">
                    ${photo.status === 'pending' ? '⏳ Non traité' : '✓ Traité'}
                </span>
            </div>
            ${photo.status === 'processed' ? `
                <div class="processed-by">
                    <strong>Traité par:</strong> ${photo.processedBy} le ${photo.processedDate}
                </div>
            ` : ''}
            <div class="photo-actions">
                ${photo.status === 'pending' ? `
                    <button class="btn-small btn-process" onclick="quickProcess(${photo.id})">Traiter</button>
                ` : ''}
                ${currentUser && currentUser.role === "gerant" ? 
                    `<button class="btn-small btn-delete" onclick="deletePhoto(${photo.id})">Supprimer</button>` 
                    : ""}
            </div>
        </div>
    `).join('');
}

function updatePhotoSelect() {
    const select = document.getElementById('photoSelect');
    if(!select) return;
    
    const pendingPhotos = photos.filter(p => p.status === 'pending');
    
    select.innerHTML = '<option value="">Choisir...</option>' + 
        pendingPhotos.map(p => `<option value="${p.id}">${p.owner} (${p.count} photos)</option>`).join('');
}

function quickProcess(photoId) {
    const processor = prompt('Entrez votre nom:');
    if (processor) {
        const photo = photos.find(p => p.id === photoId);
        if (photo) {
            photo.status = 'processed';
            photo.processedBy = processor;
            photo.processedDate = new Date().toLocaleString('fr-FR');
            savePhotos();
            updateDisplay();
        }
    }
}

function deletePhoto(photoId) {
    // Vérifier si l'utilisateur est connecté et est gérant
    if (!currentUser || currentUser.role !== "gerant") {
        alert("⛔ Accès refusé : seul le gérant peut supprimer.");
        return;
    }

    if (confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) {
        photos = photos.filter(p => p.id !== photoId);
        savePhotos();
        updateDisplay();
        alert("Photo supprimée avec succès !");
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.photo-list').forEach(l => l.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(tab + 'Photos').classList.add('active');
}

document.getElementById("clientNumber").value;


function deleteUser(i){
    if(confirm(`⚠️ ATTENTION !\n\nVoulez-vous SUPPRIMER DÉFINITIVEMENT le compte de ${users[i].name} ?\n\nCette action est irréversible !`)){
        const userName = users[i].name;
        users.splice(i, 1);
        localStorage.setItem("users", JSON.stringify(users));
        loadUsersTable();
        alert(`✓ Le compte de ${userName} a été supprimé définitivement.`);
    }
}


function loadUsersTable(){
    let html = '<tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Validation</th><th>Actions</th></tr>';
    users.forEach((u, i) => {
        html += `<tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td>
                ${u.role === "gerant" ? "—" : `
                    <button onclick="validateUser(${i})">${u.validated ? "Validé" : "Valider"}</button>
                    ${u.validated ? `<button onclick="revokeAccess(${i})">Révoquer</button>` : ""}
                `}
            </td>
            <td>
                ${u.role === "gerant" ? "—" : `
                    <button onclick="deleteUser(${i})" style="background: #D32F2F; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;">
                          Supprimer
                    </button>
                `}
            </td>
        </tr>`;
    });
    usersTable.innerHTML = html;
}













