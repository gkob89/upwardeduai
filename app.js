// 1. Get Firebase methods from the "Bridge" we built in HTML
const { 
    collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, 
    ref, uploadBytes, getDownloadURL 
} = window.fbMethods;

const db = window.db;
const storage = window.storage;

let selectedFile = null;
let allPosts = [];

// --- ADMIN ACTIONS (Saving Data) ---

// Handle Image Selection
window.handleImageUpload = (event) => {
    selectedFile = event.target.files[0];
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const uploadArea = document.getElementById('uploadArea');
            uploadArea.innerHTML = `<img src="${e.target.result}" class="image-preview">`;
        };
        reader.readAsDataURL(selectedFile);
    }
};

// Add Post to Firebase
window.addPost = async (event) => {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = "Publishing...";

    let imageUrl = "";

    try {
        // 1. Upload Image to Storage if exists
        if (selectedFile) {
            const storageRef = ref(storage, `covers/${Date.now()}_${selectedFile.name}`);
            const snapshot = await uploadBytes(storageRef, selectedFile);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        // 2. Save Data to Firestore
        await addDoc(collection(db, "posts"), {
            title: document.getElementById('postTitle').value,
            category: document.getElementById('postCategory').value,
            excerpt: document.getElementById('postExcerpt').value,
            content: document.getElementById('postContent').value,
            readTime: document.getElementById('postReadTime').value,
            image: imageUrl,
            createdAt: Date.now(),
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        });

        alert("Success! Post is live.");
        location.reload(); 
    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
        btn.disabled = false;
        btn.innerText = "Publish Post";
    }
};

// Delete Post
window.deletePost = async (postId) => {
    if (confirm("Delete this post permanently?")) {
        try {
            await deleteDoc(doc(db, "posts", postId));
            location.reload();
        } catch (error) {
            alert("Error deleting: " + error.message);
        }
    }
};

// --- VISITOR ACTIONS (Reading Data) ---

// Load Posts from Firebase
async function loadPosts() {
    const blogGrid = document.getElementById('blogGrid');
    blogGrid.innerHTML = '<p style="color:white; text-align:center;">Loading insights...</p>';

    try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        allPosts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderPosts(allPosts);
    } catch (error) {
        console.error(error);
        blogGrid.innerHTML = '<p style="color:red;">Error loading posts.</p>';
    }
}

// Display Posts in the Grid
function renderPosts(postsToRender) {
    const grid = document.getElementById('blogGrid');
    
    if (postsToRender.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>No posts yet.</h3></div>';
        return;
    }

    grid.innerHTML = postsToRender.map(post => `
        <div class="blog-card" data-category="${post.category}">
            <img src="${post.image || 'https://via.placeholder.com/400x200'}" class="card-image" alt="${post.title}">
            <div class="card-actions">
                <button onclick="deletePost('${post.id}')">Delete</button>
            </div>
            <div class="card-content">
                <span class="card-category">${post.category}</span>
                <h2 class="card-title">${post.title}</h2>
                <p class="card-excerpt">${post.excerpt}</p>
                <div class="card-meta">
                    <span>${post.date} • ${post.readTime} min read</span>
                    <a href="#" class="read-more" onclick="event.preventDefault(); window.openModal('${post.id}')">Read More →</a>
                </div>
            </div>
        </div>
    `).join('');
}

// Open Modal with Full Content
window.openModal = (postId) => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    document.getElementById('modalCategory').textContent = post.category;
    document.getElementById('modalTitle').textContent = post.title;
    document.getElementById('modalMeta').textContent = `${post.date} • ${post.readTime} min read`;
    document.getElementById('modalContent').textContent = post.content;
    
    const header = document.getElementById('modalHeader');
    header.innerHTML = post.image ? `<img src="${post.image}">` : '';
    header.innerHTML += `<button class="modal-close" onclick="closePostModal()">×</button>`;

    document.getElementById('postModal').classList.add('active');
    document.body.style.overflow = 'hidden';
};

// Search & Filter Logic
document.getElementById('searchBox').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allPosts.filter(p => 
        p.title.toLowerCase().includes(term) || 
        p.content.toLowerCase().includes(term)
    );
    renderPosts(filtered);
});

// Run on page load
loadPosts();
