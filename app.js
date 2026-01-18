// 1. Sync with Firebase Bridge tools exported to window
const { 
    collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc,
    ref, uploadBytes, getDownloadURL 
} = window.fbMethods;

const db = window.db;
const storage = window.storage;
let selectedFile = null;
let allPosts = [];

// --- IMAGE SELECTION & PREVIEW ---
window.handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imagePreviewContainer');
            preview.innerHTML = `
                <div style="margin-top:10px;">
                    <p style="color:green; font-size:0.8rem;">✓ Image Ready: ${file.name}</p>
                    <img src="${e.target.result}" style="max-width:180px; border-radius:8px; margin-top:5px; border: 1px solid #ddd;">
                </div>`;
        };
        reader.readAsDataURL(file);
    }
};

// --- DATA LOGIC: LOAD CONTENT ---
async function fetchContent() {
    console.log("Fetching content from upwardeduai...");
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
    // Render Homepage Grid (Symmetric 4-column)
    const grid = document.getElementById('blogGrid');
    if (allPosts.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:40px;">No posts published yet.</p>';
    } else {
        grid.innerHTML = allPosts.map(p => `
            <div class="blog-card">
                <img src="${p.image || 'https://via.placeholder.com/400x200?text=Upward+Edu'}" class="card-image">
                <div class="card-body">
                    <h2 class="card-title">${p.title}</h2>
                    <p class="card-excerpt">${p.excerpt || ''}</p>
                    <div class="card-footer" style="margin-top:auto; display:flex; justify-content:space-between; align-items:center; padding-top:15px; border-top: 1px solid #333;">
                        <button class="btn-share" onclick="window.sharePost('${p.title}')" style="background:none; border:none; color:#667eea; cursor:pointer; font-weight:600;">Share</button>
                        <button class="btn-read" onclick="window.openFullPost('${p.id}')" style="background:#667eea; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:600;">Read Article</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Render Dashboard Table
    const tbody = document.getElementById('dash-tbody');
    tbody.innerHTML = allPosts.map(p => `
        <tr>
            <td><strong>${p.title}</strong></td>
            <td>${p.date}</td>
            <td>
                <button onclick="window.initEdit('${p.id}')" style="padding:5px 10px; cursor:pointer; border-radius:4px; border:1px solid #ccc; margin-right:5px;">Edit</button>
                <button onclick="window.deletePost('${p.id}')" style="padding:5px 10px; color:red; cursor:pointer; border-radius:4px; border:1px solid #ffcccc;">Delete</button>
            </td>
        </tr>
    `).join('');
}

// --- SUBMIT (CREATE OR UPDATE) ---
window.submitPost = async () => {
    const submitBtn = document.querySelector('button[onclick="window.submitPost()"]');
    const docId = document.getElementById('edit-doc-id').value;
    const title = document.getElementById('postTitle').value;
    const excerpt = document.getElementById('postExcerpt').value;
    const content = window.editor.root.innerHTML;
    const readTime = document.getElementById('postReadTime').value;

    if(!title || content === "<p><br></p>") {
        alert("Please provide a Title and Content.");
        return;
    }

    try {
        submitBtn.innerText = "Processing...";
        submitBtn.disabled = true;

        let imageUrl = null;
        if (selectedFile) {
            const sRef = ref(storage, `covers/${Date.now()}_${selectedFile.name}`);
            const uploadSnap = await uploadBytes(sRef, selectedFile);
            imageUrl = await getDownloadURL(uploadSnap.ref);
        }

        const postData = {
            title, excerpt, content, readTime,
            updatedAt: Date.now()
        };
        if (imageUrl) postData.image = imageUrl;

        if (docId) {
            await updateDoc(doc(db, "posts", docId), postData);
            alert("Post updated!");
        } else {
            postData.createdAt = Date.now();
            postData.date = new Date().toLocaleDateString();
            await addDoc(collection(db, "posts"), postData);
            alert("Post published!");
        }
        location.reload();
    } catch (e) {
        console.error("Submit Error:", e);
        alert("Error: " + e.message);
        submitBtn.innerText = "Save & Publish";
        submitBtn.disabled = false;
    }
};

// --- CRUD ACTIONS ---
window.initEdit = (id) => {
    const p = allPosts.find(x => x.id === id);
    if (!p) return;
    document.getElementById('edit-doc-id').value = p.id;
    document.getElementById('postTitle').value = p.title;
    document.getElementById('postExcerpt').value = p.excerpt;
    document.getElementById('postReadTime').value = p.readTime || 5;
    window.editor.root.innerHTML = p.content;
    
    document.getElementById('dashboard-list').style.display = 'none';
    document.getElementById('post-form-section').style.display = 'block';
};

window.deletePost = async (id) => {
    if(confirm("Are you sure you want to delete this post?")) {
        try {
            await deleteDoc(doc(db, "posts", id));
            location.reload();
        } catch (e) {
            alert("Error deleting: " + e.message);
        }
    }
};

window.openFullPost = (id) => {
    const p = allPosts.find(x => x.id === id);
    if(!p) return;

    document.getElementById('modalTitle').innerText = p.title;
    document.getElementById('modalMeta').innerText = `${p.date} • ${p.readTime || 5} min read • by UPWARD EDU`;
    document.getElementById('modalContent').innerHTML = p.content;
    
    const header = document.getElementById('modalHeader');
    header.innerHTML = p.image ? `<img src="${p.image}">` : `<div style="height:150px; background:linear-gradient(135deg,#667eea,#764ba2)"></div>`;
    
    document.getElementById('postModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.title = `${p.title} | Upward Edu AI`;
};

window.sharePost = (title) => {
    const url = window.location.href;
    const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`;
    window.open(fb, '_blank', 'width=600,height=400');
};

// Run on page load
fetchContent();
