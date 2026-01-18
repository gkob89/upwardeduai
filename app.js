// 1. Pull the specific tools we need from the global window object
const { collection, addDoc, getDocs, query, orderBy } = window.firebaseFirestore;
const { ref, uploadBytes, getDownloadURL } = window.firebaseStorage;
const db = window.db;
const storage = window.storage;

// 2. Setup a variable to hold the image file temporarily
let selectedFile = null;

// This function runs when you pick an image in the form
window.handleImageUpload = (event) => {
    selectedFile = event.target.files[0];
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const uploadArea = document.getElementById('uploadArea');
            uploadArea.classList.add('has-image');
            uploadArea.innerHTML = `<img src="${e.target.result}" class="image-preview">`;
        };
        reader.readAsDataURL(selectedFile);
    }
};

// 3. THE MAIN ACTION: Sending data to Firebase
window.addPost = async (event) => {
    event.preventDefault(); // Stop the page from refreshing
    
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    let imageUrl = "";

    try {
        // A. If there is an image, upload it to "Storage" first
        if (selectedFile) {
            const storageRef = ref(storage, `blog_covers/${Date.now()}_${selectedFile.name}`);
            const snapshot = await uploadBytes(storageRef, selectedFile);
            imageUrl = await getDownloadURL(snapshot.ref); // Get the public link
        }

        // B. Save the text and the Image Link to "Firestore"
        await addDoc(collection(db, "posts"), {
            title: title,
            category: document.getElementById('postCategory').value,
            excerpt: document.getElementById('postExcerpt').value,
            content: content,
            image: imageUrl,
            readTime: document.getElementById('postReadTime').value,
            createdAt: Date.now(),
            date: new Date().toLocaleDateString()
        });

        alert("Post Published to the Cloud!");
        location.reload(); // Refresh to see the new post
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to save: " + error.message);
    }
};
