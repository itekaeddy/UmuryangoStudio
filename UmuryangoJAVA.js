let photos = [];

// === FIREBASE CONFIG ===
const firebaseConfig = {
  apiKey: "AIzaSyD1VJglvZ1zuxnV3YyoPAyWeyR9XNIurv8",
  authDomain: "umuryango-studiodb.firebaseapp.com",
  databaseURL: "https://umuryango-studiodb-default-rtdb.firebaseio.com",
  projectId: "umuryango-studiodb",
  storageBucket: "umuryango-studiodb.firebasestorage.app",
  messagingSenderId: "128360607141",
  appId: "1:128360607141:web:9562ad9f8d8a25f7f28c4c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ================= USERS =================
let users = [];
let currentUser = null;

db.ref("users").on("value", snapshot => {
    const data = snapshot.val();

    // Toujours forcer users comme tableau
    users = Array.isArray(data) ? data : (data ? Object.values(data) : []);

    // Vérifier si le gérant existe
    const gerantExiste = users.find(u => u.email === "gerant@umuryango.com");

    if (!gerantExiste) {
        users.push({
            name: "Gérant",
            email: "gerant@umuryango.com",
            password: "admin123",
            role: "gerant",
            validated: true
        });

        db.ref("users").set(users);
    }
});


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

    if(users.find(u => u.email === email)) return alert("Email déjà utilisé");

    users.push({name, email, password, role:"employe", validated:false});
    db.ref("users").set(users);
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
    loadDashboard();
}

function logout(){
    currentUser = null;
    location.reload();
}

// ================= DASHBOARD =================
function loadDashboard(){
    loginPage.classList.add('hidden');
    registerPage.classList.add('hidden');
    dashboard.classList.remove('hidden');

    roleInfo.innerHTML = `Connecté en tant que : ${currentUser.name} (${currentUser.role})
    <button onclick="logout()" style="display:block;margin:10px auto 0;">Déconnexion</button>`;

    if(currentUser.role === "gerant"){
        userManagement.classList.remove('hidden');
        loadUsersTable();
    }

    loadPhotos();
}

// ================= USERS TABLE =================
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
                    <button onclick="deleteUser(${i})">Supprimer</button>
                `}
            </td>
        </tr>`;
    });
    usersTable.innerHTML = html;
}

function validateUser(i){
    users[i].validated = true;
    db.ref("users").set(users);
    loadUsersTable();
}

function revokeAccess(i){
    if(confirm("Confirmer révocation ?")){
        users[i].validated = false;
        db.ref("users").set(users);
        loadUsersTable();
    }
}

function deleteUser(i){
    if(confirm("Supprimer définitivement ?")){
        users.splice(i, 1);
        db.ref("users").set(users);
        loadUsersTable();
    }
}

// ================= PHOTOS =================
function loadPhotos() {
    db.ref("photos").on("value", snapshot => {
        const data = snapshot.val();
        if (!data) {
            photos = [];
        } else {
            photos = Object.keys(data).map(key => ({
                firebaseId: key,
                ...data[key]
            }));
        }
        updateDisplay();
    });
}

// ================= EVENTS =================
document.addEventListener('DOMContentLoaded', function() {

    if(photoForm){
        photoForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const newPhoto = {
                clientNumber: clientNumber.value,
                owner: ownerName.value,
                count: parseInt(photoCount.value),
                amount: parseFloat(clientAmount.value) || 0,
                status: 'pending',
                processedBy: null,
                processedDate: null,
                addedDate: new Date().toLocaleString('fr-FR')
            };

            db.ref("photos").push(newPhoto);
            photoForm.reset();
        });
    }

    if(processForm){
        processForm.addEventListener('submit', function(e){
            e.preventDefault();

            const photoId = photoSelect.value;
            const processor = processorName.value;

            db.ref("photos/" + photoId).update({
                status: "processed",
                processedBy: processor,
                processedDate: new Date().toLocaleString('fr-FR')
            });

            processForm.reset();
        });
    }
});

// ================= UTILS =================
function calculerTotalArgent() {
    let total = 0;
    for (let p of photos) total += Number(p.amount) || 0;
    return total;
}
