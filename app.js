// 1. Setup global variables
const { 
    collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc,
    ref, uploadBytes, getDownloadURL 
} = window.fbMethods;

const db = window.db;
const storage = window.storage;
let selectedFile = null; 
let allPosts = [];

// 2. IMAGE HANDLER (Fixes the "site won't keep it" issue)
window.handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        selectedFile = file; // Store the actual file in our global variable
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewContainer = document.getElementById('imagePreviewContainer');
            // Show the user that the image is "kept"
            previewContainer.innerHTML = `
                <div style="margin-top:10px;">
                    <p style="font-size:0.8rem; color:green;">✓ Image selected: ${file.name}</p>
                    <img src="${e.target.result}" style="max-width:150px; border-radius:8px; margin-top:5px;">
                </div>`;
        };
        reader.readAsDataURL(file);
    }
};

// 3. SUBMIT LOGIC (Create & Edit)
window.submitPost = async () => {
    const docId = document.getElementById('edit-doc-id').value;
    const title = document.getElementById('postTitle').value;
    const excerpt = document.getElementById('postExcerpt').value;
    const content = window.editor.root.innerHTML; // Gets formatted text from Quill

    if (!title || !content) {
        alert("Please enter at least a title and content.");
        return;
    }

    try {
        let imageUrl = null;
        // Upload image only if a new one was selected
        if (selectedFile) {
            const sRef = ref(storage, `covers/${Date.now()}_${selectedFile.name}`);
            const snap = await uploadBytes(sRef, selectedFile);
            imageUrl = await getDownloadURL(snap.ref);
        }

        const postData = {
            title: title,
            excerpt: excerpt,
            content: content,
            updatedAt: Date.now()
        };

        if (imageUrl) postData.image = imageUrl;

        if (docId) {
            await updateDoc(doc(db, "posts", docId), postData);
            alert("Post updated successfully!");
        } else {
            postData.createdAt = Date.now();
            postData.date = new Date().toLocaleDateString();
            await addDoc(collection(db, "posts"), postData);
            alert("Post published successfully!");
        }
        location.reload();
    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    }
};

// 4. DASHBOARD & GRID RENDERERS
async function loadData() {
    try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        renderGrid();
        renderDashboard();
    } catch (e) {
        console.error("Load Error:", e);
    }
}

function renderGrid() {
    const grid = document.getElementById('blogGrid');
    // Enforcing the 4-column symmetric grid
    grid.innerHTML = allPosts.map(p => `
        <div class="blog-card">
            <img src="${p.image || 'https://via.placeholder.com/400x200?text=No+Image'}" class="card-image">
            <div class="card-body">
                <h2 class="card-title" style="color:white;">${p.title}</h2>
                <p style="color:#aaa; font-size:0.85rem; margin-bottom:15px;">${p.excerpt}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto;">
                    <button onclick="window.sharePost('${p.title}')" style="background:none; border:none; color:#667eea; cursor:pointer; font-size:0.8rem;">Share</button>
                    <button onclick="window.openFullPost('${p.id}')" style="background:#667eea; border:none; padding:6px 12px; border-radius:4px; color:white; cursor:pointer; font-size:0.8rem;">Read</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderDashboard() {
    const tbody = document.getElementById('dash-tbody');
    tbody.innerHTML = allPosts.map(p => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding:10px;">${p.title}</td>
            <td style="padding:10px;">${p.date}</td>
            <td style="padding:10px;">
                <button onclick="window.editPost('${p.id}')" style="margin-right:5px; cursor:pointer;">Edit</button>
                <button onclick="window.deletePost('${p.id}')" style="color:red; cursor:pointer;">Delete</button>
            </td>
        </tr>
    `).join('');
}

// 5. ACTIONS
window.editPost = (id) => {
    const p = allPosts.find(x => x.id === id);
    document.getElementById('edit-doc-id').value = p.id;
    document.getElementById('postTitle').value = p.title;
    document.getElementById('postExcerpt').value = p.excerpt;
    window.editor.root.innerHTML = p.content; // Put the HTML back into the editor
    
    document.getElementById('dashboard-list').style.display = 'none';
    document.getElementById('post-form-section').style.display = 'block';
};

window.deletePost = async (id) => {
    if(confirm("Are you sure you want to delete this post?")) {
        await deleteDoc(doc(db, "posts", id));
        location.reload();
    }
};

window.sharePost = (title) => {
    const url = window.location.href;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent("Check out this post: " + title)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
};

loadData();
