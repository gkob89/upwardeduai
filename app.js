// --- DATABASE INITIALIZATION ---
const { 
    collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc,
    ref, uploadBytes, getDownloadURL 
} = window.fbMethods;

const db = window.db;
const storage = window.storage;
let selectedFile = null;
let allPosts = [];

// --- 1. IMAGE HANDLER ---
window.handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('imagePreviewContainer').innerHTML = 
                `<img src="${e.target.result}" style="max-width:150px; border-radius:8px; margin-top:10px;">`;
        };
        reader.readAsDataURL(file);
    }
};

// --- 2. LOAD DATA ---
async function fetchContent() {
    try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderUI();
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

function renderUI() {
    // HOMEPAGE GRID (Hyperlinked Titles & Images)
    const grid = document.getElementById('blogGrid');
    grid.innerHTML = allPosts.map(p => `
        <div class="blog-card">
            <img src="${p.image || 'https://via.placeholder.com/400x200'}" class="card-image" onclick="window.openFullPost('${p.id}')">
            <div class="card-body">
                <h2 class="card-title" onclick="window.openFullPost('${p.id}')">${p.title}</h2>
                <p class="card-excerpt">${p.excerpt || ''}</p>
                <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:center;">
                    <button class="btn-share" onclick="window.sharePost('${p.title}')" style="background:none; border:none; color:#667eea; cursor:pointer; font-weight:600;">Share</button>
                    <button onclick="window.openFullPost('${p.id}')" style="background:#667eea; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:600;">Read</button>
                </div>
            </div>
        </div>
    `).join('');

    // DASHBOARD TABLE (Edit & Delete Fix)
    const tbody = document.getElementById('dash-tbody');
    tbody.innerHTML = allPosts.map(p => `
        <tr>
            <td><strong>${p.title}</strong></td>
            <td>${p.date}</td>
            <td>
                <button onclick="window.initEdit('${p.id}')" style="cursor:pointer; margin-right:5px;">Edit</button>
                <button onclick="window.deletePost('${p.id}')" style="cursor:pointer; color:red;">Delete</button>
            </td>
        </tr>
    `).join('');
}

// --- 3. SUBMIT (Create & Update) ---
window.submitPost = async () => {
    const docId = document.getElementById('edit-doc-id').value;
    const title = document.getElementById('postTitle').value;
    const excerpt = document.getElementById('postExcerpt').value;
    const content = window.editor.root.innerHTML;

    if (!title || content === "<p><br></p>") return alert("Title and Content are required.");

    try {
        let imageUrl = null;
        if (selectedFile) {
            const sRef = ref(storage, `covers/${Date.now()}_${selectedFile.name}`);
            const snap = await uploadBytes(sRef, selectedFile);
            imageUrl = await getDownloadURL(snap.ref);
        }

        const data = { title, excerpt, content, updatedAt: Date.now() };
        if (imageUrl) data.image = imageUrl;

        if (docId) {
            await updateDoc(doc(db, "posts", docId), data);
            alert("Post updated!");
        } else {
            data.createdAt = Date.now();
            data.date = new Date().toLocaleDateString();
            await addDoc(collection(db, "posts"), data);
            alert("Published!");
        }
        location.reload();
    } catch (e) { alert("Error: " + e.message); }
};

// --- 4. MODAL & ACTIONS ---
window.openFullPost = (id) => {
    const p = allPosts.find(x => x.id === id);
    if (!p) return;

    document.getElementById('modalTitle').innerText = p.title;
    document.getElementById('modalContent').innerHTML = p.content;
    document.getElementById('modalMeta').innerText = `${p.date} • by UPWARD EDU`;
    
    const header = document.getElementById('modalHeader');
    header.innerHTML = p.image ? `<img src="${p.image}" class="modal-image" style="width:100%; height:350px; object-fit:cover;">` : '';

    document.getElementById('postModal').classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.initEdit = (id) => {
    const p = allPosts.find(x => x.id === id);
    if (!p) return;
    document.getElementById('edit-doc-id').value = p.id;
    document.getElementById('postTitle').value = p.title;
    document.getElementById('postExcerpt').value = p.excerpt;
    window.editor.root.innerHTML = p.content;
    document.getElementById('dashboard-list').style.display = 'none';
    document.getElementById('post-form-section').style.display = 'block';
};

window.deletePost = async (id) => {
    if (confirm("Permanently delete this post?")) {
        await deleteDoc(doc(db, "posts", id));
        location.reload();
    }
};

window.sharePost = (title) => {
    const url = window.location.href;
    const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`;
    window.open(fb, '_blank', 'width=600,height=400');
};

fetchContent();
