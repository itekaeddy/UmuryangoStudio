// === CONFIGURATION FIREBASE ===
// ⚠️ REMPLACEZ CES VALEURS PAR VOTRE PROPRE CONFIG FIREBASE
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyA2rzTYCSp1bBkOeHwYBOiI1PO9WBagd_I",
    authDomain: "umuryangodb.firebaseapp.com",
    projectId: "umuryangodb",
    storageBucket: "umuryangodb.firebasestorage.app",
    messagingSenderId: "1032027160860",
    appId: "1:1032027160860:web:89faa406decb5a0bb4fad9"
  };

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let photos = [];
let users = [];
let currentUser = null;

// === INITIALISATION AU CHARGEMENT ===
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Récupérer les données de l'utilisateur depuis Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            currentUser = { uid: user.uid, ...userDoc.data() };
            
            // Le gérant n'a pas besoin de validation, les employés oui
            if (currentUser.role === "gerant" || currentUser.validated) {
                loadDashboard();
            } else {
                alert("Votre compte n'est pas encore validé par le gérant");
                logout();
            }
        }
    } else {
        currentUser = null;
        const loginPage = document.getElementById('loginPage');
        const dashboard = document.getElementById('dashboard');
        if (loginPage) loginPage.classList.remove('hidden');
        if (dashboard) dashboard.classList.add('hidden');
    }
});

// === CRÉER LE COMPTE GÉRANT PAR DÉFAUT ===
async function createDefaultGerant() {
    try {
        // Vérifier si le gérant existe déjà
        const gerantQuery = await db.collection('users')
            .where('email', '==', 'gerant@umuryango.com')
            .get();
        
        if (gerantQuery.empty) {
            // Créer le compte Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(
                'gerant@umuryango.com', 
                'admin123'
            );
            
            // Ajouter les infos dans Firestore
            await db.collection('users').doc(userCredential.user.uid).set({
                name: "Gérant",
                email: "gerant@umuryango.com",
                role: "gerant",
                validated: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log("Compte gérant créé avec succès");
        }
    } catch (error) {
        console.log("Le gérant existe déjà ou erreur:", error.message);
    }
}

// Appeler cette fonction au chargement de la page
createDefaultGerant();

// === FONCTIONS D'AUTHENTIFICATION ===
function showRegister() {
    loginPage.classList.add('hidden');
    registerPage.classList.remove('hidden');
}

function showLogin() {
    registerPage.classList.add('hidden');
    loginPage.classList.remove('hidden');
}

async function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    try {
        // Créer l'utilisateur dans Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Ajouter les informations dans Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: "employe",
            validated: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert("Compte créé — en attente de validation par le gérant");
        await auth.signOut();
        showLogin();
    } catch (error) {
        alert("Erreur lors de l'inscription: " + error.message);
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        // Le reste est géré par onAuthStateChanged
    } catch (error) {
        alert("Identifiants incorrects: " + error.message);
    }
}

async function logout() {
    await auth.signOut();
    currentUser = null;
    location.reload();
}

// === GESTION DU DASHBOARD ===
async function loadDashboard() {
    loginPage.classList.add('hidden');
    registerPage.classList.add('hidden');
    dashboard.classList.remove('hidden');
    
document.getElementById('roleInfo').innerHTML = `
    Connecté en tant que : ${currentUser.name} (${currentUser.role}) 
    <button onclick="logout()">Déconnexion</button>
`;
    
    if (currentUser.role === "gerant") {
        document.getElementById('userManagement').classList.remove('hidden');
        loadUsersTable();
    }
    
    loadPhotos();
}

// === GESTION DES UTILISATEURS (GÉRANT) ===
async function loadUsersTable() {
    const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    
    let html = '<tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Validation</th><th>Actions</th></tr>';
    users.forEach((u) => {
        html += `<tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td>
                ${u.role === "gerant" ? "—" : `
                    <button onclick="validateUser('${u.uid}')">${u.validated ? "Validé" : "Valider"}</button>
                    ${u.validated ? `<button onclick="revokeAccess('${u.uid}')">Révoquer</button>` : ""}
                `}
            </td>
            <td>
                ${u.role === "gerant" ? "—" : `
                    <button onclick="deleteUser('${u.uid}')" style="background: #D32F2F; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;">
                        Supprimer
                    </button>
                `}
            </td>
        </tr>`;
    });
    document.getElementById('usersTable').innerHTML = html;
}

async function validateUser(uid) {
    await db.collection('users').doc(uid).update({ validated: true });
    loadUsersTable();
}

async function revokeAccess(uid) {
    const user = users.find(u => u.uid === uid);
    if (confirm(`Êtes-vous sûr de vouloir révoquer l'accès de ${user.name} ?`)) {
        await db.collection('users').doc(uid).update({ validated: false });
        loadUsersTable();
    }
}

async function deleteUser(uid) {
    const user = users.find(u => u.uid === uid);
    if (confirm(`⚠️ ATTENTION !\n\nVoulez-vous SUPPRIMER DÉFINITIVEMENT le compte de ${user.name} ?\n\nCette action est irréversible !`)) {
        await db.collection('users').doc(uid).delete();
        loadUsersTable();
        alert(`✓ Le compte de ${user.name} a été supprimé définitivement.`);
    }
}

// === GESTION DES PHOTOS ===
async function loadPhotos() {
    // Écouter les changements en temps réel
    db.collection('photos').orderBy('addedDate', 'desc').onSnapshot((snapshot) => {
        photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateDisplay();
    });
}

// Initialiser les événements
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('photoForm')) {
        document.getElementById('photoForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const owner = document.getElementById('ownerName').value;
            const clientNumber = document.getElementById('clientNumber').value;
            const count = parseInt(document.getElementById('photoCount').value);
            const amount = parseFloat(document.getElementById('clientAmount').value) || 0;

            try {
                await db.collection('photos').add({
                    clientNumber: clientNumber,
                    owner: owner,
                    count: count,
                    amount: amount,
                    status: 'pending',
                    processedBy: null,
                    processedDate: null,
                    addedDate: firebase.firestore.FieldValue.serverTimestamp(),
                    addedBy: currentUser.uid
                });

                document.getElementById('photoForm').reset();
                alert('Photos ajoutées avec succès !');
            } catch (error) {
                alert('Erreur lors de l\'ajout: ' + error.message);
            }
        });
    }

    if (document.getElementById('processForm')) {
        document.getElementById('processForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const processor = document.getElementById('processorName').value;
            const photoId = document.getElementById('photoSelect').value;

            try {
                await db.collection('photos').doc(photoId).update({
                    status: 'processed',
                    processedBy: processor,
                    processedDate: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('processForm').reset();
                alert('Photo marquée comme traitée !');
            } catch (error) {
                alert('Erreur: ' + error.message);
            }
        });
    }
});

function updateDisplay() {
    const totalCount = photos.reduce((sum, p) => sum + p.count, 0);
    const pendingCount = photos.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.count, 0);
    const processedCount = photos.filter(p => p.status === 'processed').reduce((sum, p) => sum + p.count, 0);
    const totalMoney = calculerTotalArgent();

    document.getElementById('totalPhotos').textContent = totalCount + " 📸 ";
    document.getElementById('pendingPhotos').textContent = pendingCount;
    document.getElementById('processedPhotos').textContent = processedCount;
    document.getElementById('totalArgents').textContent = totalMoney + " FBU ";

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

    container.innerHTML = photoList.map(photo => {
        // Convertir le timestamp Firebase en date lisible
        let dateStr = 'Date inconnue';
        if (photo.addedDate && photo.addedDate.toDate) {
            dateStr = photo.addedDate.toDate().toLocaleString('fr-FR');
        }
        
        let processedDateStr = '';
        if (photo.processedDate && photo.processedDate.toDate) {
            processedDateStr = photo.processedDate.toDate().toLocaleString('fr-FR');
        }
        
        return `
        <div class="photo-item">
            <div class="photo-header">
                <div class="photo-info">
                    <div class="photo-owner">${photo.owner}</div>
                    <div class="client-number">Client n° ${photo.clientNumber}</div>
                    <div class="photo-count">${photo.count} photo${photo.count > 1 ? 's' : ''} • Montant: ${photo.amount} FBU • Ajouté le ${dateStr}</div>
                </div>
                <span class="photo-status ${photo.status === 'pending' ? 'status-pending' : 'status-processed'}">
                    ${photo.status === 'pending' ? '⏳ Non traité' : '✓ Traité'}
                </span>
            </div>
            ${photo.status === 'processed' ? `
                <div class="processed-by">
                    <strong>Traité par:</strong> ${photo.processedBy} le ${processedDateStr}
                </div>
            ` : ''}
            <div class="photo-actions">
                ${photo.status === 'pending' ? `
                    <button class="btn-small btn-process" onclick="quickProcess('${photo.id}')">Traiter</button>
                ` : ''}
                ${currentUser && currentUser.role === "gerant" ? 
                    `<button class="btn-small btn-delete" onclick="deletePhoto('${photo.id}')">Supprimer</button>` 
                    : ""}
            </div>
        </div>
    `}).join('');
}

function updatePhotoSelect() {
    const select = document.getElementById('photoSelect');
    if (!select) return;
    
    const pendingPhotos = photos.filter(p => p.status === 'pending');
    
    select.innerHTML = '<option value="">Choisir...</option>' + 
        pendingPhotos.map(p => `<option value="${p.id}">${p.owner} (${p.count} photos)</option>`).join('');
}

async function quickProcess(photoId) {
    const processor = prompt('Entrez votre nom:');
    if (processor) {
        try {
            await db.collection('photos').doc(photoId).update({
                status: 'processed',
                processedBy: processor,
                processedDate: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    }
}

async function deletePhoto(photoId) {
    if (!currentUser || currentUser.role !== "gerant") {
        alert("⛔ Accès refusé : seul le gérant peut supprimer.");
        return;
    }

    if (confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) {
        try {
            await db.collection('photos').doc(photoId).delete();
            alert("Photo supprimée avec succès !");
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.photo-list').forEach(l => l.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(tab + 'Photos').classList.add('active');
}

function calculerTotalArgent() {
    let total = 0;
    for (let i = 0; i < photos.length; i++) {
        total += Number(photos[i].amount) || 0;
    }
    return total;
}


