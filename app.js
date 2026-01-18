// app.js - Optimized for upwareduai
const { 
    collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc,
    ref, uploadBytes, getDownloadURL 
} = window.fbMethods;

const db = window.db;
const storage = window.storage;
let selectedFile = null;
let allPosts = [];

console.log("App.js loaded and connected to:", db);

// --- IMAGE HANDLING ---
window.handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('imagePreviewContainer').innerHTML = `<img src="${e.target.result}" style="max-width:150px; margin-top:10px; border-radius:8px;">`;
        };
        reader.readAsDataURL(file);
    }
};

// --- DATA FETCHING ---
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
    const grid = document.getElementById('blogGrid');
    grid.innerHTML = allPosts.map(p => `
        <div class="blog-card">
            <img src="${p.image || 'https://via.placeholder.com/400x200'}" class="card-image">
            <div class="card-body">
                <h2 class="card-title">${p.title}</h2>
                <p class="card-excerpt">${p.excerpt || ''}</p>
                <button onclick="window.openFullPost('${p.id}')">Read</button>
            </div>
        </div>
    `).join('');

    const tbody = document.getElementById('dash-tbody');
    tbody.innerHTML = allPosts.map(p => `
        <tr>
            <td>${p.title}</td>
            <td>${p.date}</td>
            <td>
                <button onclick="window.initEdit('${p.id}')">Edit</button>
                <button onclick="window.deletePost('${p.id}')" style="color:red;">Delete</button>
            </td>
        </tr>
    `).join('');
}

// --- THE SUBMIT BUTTON FIX ---
window.submitPost = async () => {
    console.log("Button Clicked!"); // If you don't see this in console, the link is broken.
    
    const docId = document.getElementById('edit-doc-id').value;
    const title = document.getElementById('postTitle').value;
    const excerpt = document.getElementById('postExcerpt').value;
    const content = window.editor.root.innerHTML;

    if (!title) {
        alert("Please enter a title.");
        return;
    }

    try {
        let imageUrl = null;
        if (selectedFile) {
            console.log("Uploading image...");
            const sRef = ref(storage, `covers/${Date.now()}_${selectedFile.name}`);
            const snap = await uploadBytes(sRef, selectedFile);
            imageUrl = await getDownloadURL(snap.ref);
        }

        const postData = {
            title, excerpt, content,
            updatedAt: Date.now()
        };
        if (imageUrl) postData.image = imageUrl;

        if (docId) {
            await updateDoc(doc(db, "posts", docId), postData);
        } else {
            postData.createdAt = Date.now();
            postData.date = new Date().toLocaleDateString();
            await addDoc(collection(db, "posts"), postData);
        }

        alert("Post Saved Successfully!");
        location.reload();
    } catch (e) {
        console.error("Submit Error:", e);
        alert("Error: " + e.message);
    }
};

fetchContent();
