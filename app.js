const { 
    collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc,
    ref, uploadBytes, getDownloadURL 
} = window.fbMethods;

const db = window.db;
const storage = window.storage;
let selectedFile = null;
let allPosts = [];

// 1. Image Preview Logic (Fixing your "folder opens but image won't keep" issue)
window.handleImageUpload = (event) => {
    selectedFile = event.target.files[0];
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imagePreviewContainer');
            preview.innerHTML = `<img src="${e.target.result}" style="max-width:200px; margin-top:10px; border-radius:8px;">`;
        };
        reader.readAsDataURL(selectedFile);
    }
};

// 2. Submit Logic (Handles both CREATE and EDIT)
window.submitPost = async () => {
    const docId = document.getElementById('edit-doc-id').value;
    const title = document.getElementById('postTitle').value;
    const excerpt = document.getElementById('postExcerpt').value;
    const content = window.editor.root.innerHTML; // Gets Rich Text from Quill

    let imageUrl = "";
    if (selectedFile) {
        const sRef = ref(storage, `covers/${Date.now()}_${selectedFile.name}`);
        const snap = await uploadBytes(sRef, selectedFile);
        imageUrl = await getDownloadURL(snap.ref);
    }

    const postData = {
        title, excerpt, content,
        updatedAt: Date.now()
    };
    if (imageUrl) postData.image = imageUrl;

    try {
        if (docId) {
            await updateDoc(doc(db, "posts", docId), postData);
            alert("Updated!");
        } else {
            postData.createdAt = Date.now();
            postData.date = new Date().toLocaleDateString();
            await addDoc(collection(db, "posts"), postData);
            alert("Published!");
        }
        location.reload();
    } catch (e) { alert(e.message); }
};

// 3. Load Data for Grid & Dashboard
async function loadData() {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    renderGrid();
    renderDashboard();
}

function renderGrid() {
    const grid = document.getElementById('blogGrid');
    grid.innerHTML = allPosts.map(p => `
        <div class="blog-card">
            <img src="${p.image || ''}" class="card-image">
            <div class="card-body">
                <h2 class="card-title">${p.title}</h2>
                <p style="color:#888; font-size:0.9rem;">${p.excerpt}</p>
                <div style="margin-top:15px; display:flex; justify-content:space-between;">
                    <button onclick="window.sharePost('${p.title}')" style="background:none; border:none; color:var(--primary); cursor:pointer;">Share</button>
                    <button onclick="alert('Open Modal Logic Here')" style="background:var(--primary); border:none; padding:5px 10px; border-radius:5px; color:white; cursor:pointer;">Read</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderDashboard() {
    const tbody = document.getElementById('dash-tbody');
    tbody.innerHTML = allPosts.map(p => `
        <tr>
            <td>${p.title}</td>
            <td>${p.date}</td>
            <td>
                <button onclick="window.editPost('${p.id}')">Edit</button>
                <button onclick="window.deletePost('${p.id}')" style="color:red;">Delete</button>
            </td>
        </tr>
    `).join('');
}

// 4. Edit/Delete Actions
window.editPost = (id) => {
    const p = allPosts.find(x => x.id === id);
    document.getElementById('edit-doc-id').value = p.id;
    document.getElementById('postTitle').value = p.title;
    document.getElementById('postExcerpt').value = p.excerpt;
    window.editor.root.innerHTML = p.content;
    
    document.getElementById('dashboard-list').style.display = 'none';
    document.getElementById('post-form-section').style.display = 'block';
};

window.deletePost = async (id) => {
    if(confirm("Delete?")) {
        await deleteDoc(doc(db, "posts", id));
        location.reload();
    }
};

window.sharePost = (title) => {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`);
};

loadData();
