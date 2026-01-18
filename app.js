// Sync with Firebase Bridge
const { 
    collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc,
    ref, uploadBytes, getDownloadURL 
} = window.fbMethods;

const db = window.db;
const storage = window.storage;
let selectedFile = null;
let allPosts = [];

// --- IMAGE SELECTION ---
window.handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('imagePreviewContainer').innerHTML = `
                <img src="${e.target.result}" style="max-width:200px; border-radius:8px; margin-top:10px;">
                <p style="color:green; font-size:0.8rem;">Ready for upload</p>`;
        };
        reader.readAsDataURL(file);
    }
};

// --- DATA LOGIC ---
async function fetchContent() {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderUI();
}

function renderUI() {
    // 1. Render Homepage Grid
    const grid = document.getElementById('blogGrid');
    grid.innerHTML = allPosts.map(p => `
        <div class="blog-card">
            <img src="${p.image || 'https://via.placeholder.com/400x200?text=Upward+Edu'}" class="card-image">
            <div class="card-body">
                <h2 class="card-title">${p.title}</h2>
                <p class="card-excerpt">${p.excerpt}</p>
                <div class="card-footer">
                    <button class="btn-share" onclick="window.sharePost('${p.title}')">Share</button>
                    <button class="btn-read" onclick="window.openFullPost('${p.id}')">Read Article</button>
                </div>
            </div>
        </div>
    `).join('');

    // 2. Render Dashboard Table
    const tbody = document.getElementById('dash-tbody');
    tbody.innerHTML = allPosts.map(p => `
        <tr>
            <td><strong>${p.title}</strong></td>
            <td>${p.date}</td>
            <td>
                <button onclick="window.initEdit('${p.id}')" style="padding:5px 10px; cursor:pointer;">Edit</button>
                <button onclick="window.deletePost('${p.id}')" style="padding:5px 10px; color:red; cursor:pointer;">Delete</button>
            </td>
        </tr>
    `).join('');
}

// --- SUBMIT (CREATE OR UPDATE) ---
window.submitPost = async () => {
    const docId = document.getElementById('edit-doc-id').value;
    const title = document.getElementById('postTitle').value;
    const excerpt = document.getElementById('postExcerpt').value;
    const content = window.editor.root.innerHTML;
    const readTime = document.getElementById('postReadTime').value;

    if(!title || !content) return alert("Title and Content are required.");

    try {
        let imageUrl = null;
        if (selectedFile) {
            const sRef = ref(storage, `covers/${Date.now()}_${selectedFile.name}`);
            const uploadSnap = await uploadBytes(sRef, selectedFile);
            imageUrl = await getDownloadURL(uploadSnap.ref);
        }

        const data = { title, excerpt, content, readTime, updatedAt: Date.now() };
        if (imageUrl) data.image = imageUrl;

        if (docId) {
            await updateDoc(doc(db, "posts", docId), data);
            alert("Post updated!");
        } else {
            data.createdAt = Date.now();
            data.date = new Date().toLocaleDateString();
            await addDoc(collection(db, "posts"), data);
            alert("New post published!");
        }
        location.reload();
    } catch (e) { alert(e.message); }
};

// --- CRUD ACTIONS ---
window.initEdit = (id) => {
    const p = allPosts.find(x => x.id === id);
    document.getElementById('edit-doc-id').value = p.id;
    document.getElementById('postTitle').value = p.title;
    document.getElementById('postExcerpt').value = p.excerpt;
    document.getElementById('postReadTime').value = p.readTime || 5;
    window.editor.root.innerHTML = p.content;
    
    document.getElementById('dashboard-list').style.display = 'none';
    document.getElementById('post-form-section').style.display = 'block';
};

window.deletePost = async (id) => {
    if(confirm("Confirm deletion?")) {
        await deleteDoc(doc(db, "posts", id));
        location.reload();
    }
};

window.openFullPost = (id) => {
    const p = allPosts.find(x => x.id === id);
    if(!p) return;

    document.getElementById('modalTitle').innerText = p.title;
    document.getElementById('modalMeta').innerText = `${p.date} • ${p.readTime || 5} min read • by UPWARD EDU`;
    document.getElementById('modalContent').innerHTML = p.content;
    
    const header = document.getElementById('modalHeader');
    header.innerHTML = p.image ? `<img src="${p.image}">` : `<div style="height:100px; background:linear-gradient(135deg,#667eea,#764ba2)"></div>`;
    
    document.getElementById('postModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.title = `${p.title} | Upward Edu AI`;
};

window.sharePost = (title) => {
    const url = window.location.href;
    const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`;
    window.open(fb, '_blank', 'width=600,height=400');
};

// Search Filter
document.getElementById('searchBox').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allPosts.filter(p => p.title.toLowerCase().includes(term) || p.content.toLowerCase().includes(term));
    renderPostsToGrid(filtered);
});

function renderPostsToGrid(posts) {
    const grid = document.getElementById('blogGrid');
    grid.innerHTML = posts.map(p => `
        <div class="blog-card">
            <img src="${p.image || 'https://via.placeholder.com/400x200'}" class="card-image">
            <div class="card-body">
                <h2 class="card-title">${p.title}</h2>
                <p class="card-excerpt">${p.excerpt}</p>
                <div class="card-footer">
                    <button class="btn-share" onclick="window.sharePost('${p.title}')">Share</button>
                    <button class="btn-read" onclick="window.openFullPost('${p.id}')">Read Article</button>
                </div>
            </div>
        </div>
    `).join('');
}

fetchContent();
