const emailInput = document.getElementById('email');
const messageArea = document.getElementById('message-area');
const voteButtons = document.querySelectorAll('.media-card button');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const fullscreenVideo = document.getElementById('fullscreenVideo');

// --- Voting Logic ---

async function handleVote(event) {
    const button = event.target;
    const memeId = button.dataset.memeId; // Get memeId from data attribute
    const email = emailInput.value.trim();

    // Basic email validation (more robust validation on server)
    if (!email || !email.includes('@') || !email.includes('.')) {
        showMessage('Please enter a valid email address.', 'error');
        emailInput.focus();
        return;
    }

    // Disable button and show loading message
    disableVoting(`Voting for ${memeId}...`);

    try {
        const response = await fetch('/api/vote', { // Call the backend API
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email, memeId: memeId }),
        });

        const result = await response.json(); // Always parse JSON response

        if (response.ok) { // Status 200-299
            showMessage(`Thank you for voting for ${memeId}!`, 'success');
            // Optionally disable all buttons after successful vote?
            // disableVoting('You have voted.', false); // Pass false to not show loading text
        } else {
            // Handle errors like 400, 409, 500
            showMessage(result.message || `Error: ${response.statusText}`, 'error');
            enableVoting(); // Re-enable buttons on error
        }

    } catch (error) {
        console.error('Network or fetch error:', error);
        showMessage('Could not connect to the server. Please try again later.', 'error');
        enableVoting(); // Re-enable buttons on network error
    }
}

function showMessage(message, type = 'info') {
    messageArea.textContent = message;
    messageArea.className = `message-${type}`; // Add class for styling (success, error, loading)
}

function disableVoting(message = 'Processing...', showLoadingText = true) {
    if (showLoadingText) {
        showMessage(message, 'loading');
    }
    voteButtons.forEach(btn => btn.disabled = true);
    emailInput.disabled = true; // Optional: disable email field too
}

function enableVoting() {
    showMessage(''); // Clear message
    voteButtons.forEach(btn => btn.disabled = false);
    emailInput.disabled = false;
}

// Add event listeners to all vote buttons
voteButtons.forEach(button => {
    button.addEventListener('click', handleVote);
});


// --- Modal Logic ---
function openModal(src) {
    modal.style.display = "block";
    modalImg.src = src;
}

function closeModal(event) {
    // Close only if clicking the background, not the image itself
    if (!event || event.target === modal || event.target.classList.contains('modal-close')) {
        modal.style.display = "none";
        modalImg.src = ""; // Clear src
    }
}

// --- Fullscreen Video Logic ---
function openFullscreenVideo(videoElement) {
    fullscreenVideo.src = videoElement.src;
    fullscreenOverlay.style.display = 'flex'; // Use flex to trigger centering
    fullscreenVideo.play().catch(e => console.log("Autoplay prevented:", e)); // Play and catch potential errors
}

function closeFullscreenVideo() {
    fullscreenVideo.pause();
    fullscreenVideo.src = ''; // Important to stop potential background loading/playing
    fullscreenOverlay.style.display = 'none';
}

// --- Navigation ---
function goToAdmin() {
    // Consider adding some basic check here if needed,
    // but proper security should be on the admin page itself
    window.location.href = "admin.html"; // Or just "/admin" if using server route
}

// Close modal on Escape key press
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        if (modal.style.display === 'block') {
            closeModal();
        }
        if (fullscreenOverlay.style.display === 'flex') {
            closeFullscreenVideo();
        }
    }
});