const emailInput = document.getElementById('email');
const messageArea = document.getElementById('message-area');
const voteButtons = document.querySelectorAll('.media-card button');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const fullscreenVideo = document.getElementById('fullscreenVideo');
const snackbar = document.getElementById('snackbar');

let snackbarTimeout;

function showSnackbar(message, type = 'info', duration = 3000) {
    // Clear any existing timeout to prevent immediate hiding if called again quickly
    if (snackbarTimeout) {
        clearTimeout(snackbarTimeout);
    }

    snackbar.textContent = message;
    // Apply type class (e.g., 'snackbar-error', 'snackbar-success')
    snackbar.className = 'show'; // Always add 'show'
    if (type === 'error') {
        snackbar.classList.add('snackbar-error');
    } else if (type === 'success') {
        snackbar.classList.add('snackbar-success');
    }
    // Else, uses default styling

    // Automatically hide after duration
    snackbarTimeout = setTimeout(() => {
        snackbar.className = snackbar.className.replace('show', '');
        snackbarTimeout = null; // Clear the timeout variable
    }, duration);
}

function showMessage(message, type = 'info') {
    messageArea.textContent = message;
    messageArea.className = ''; // Clear previous classes first
    if (message) {
        messageArea.classList.add(`message-${type}`);
    }
}

function disableControlsTemporarily(loadingMessageText) {
    showMessage(loadingMessageText, 'loading');
    voteButtons.forEach(btn => btn.disabled = true);
    emailInput.disabled = true;
}

// Function to RE-ENABLE controls after non-permanent failure
function enableControls() {
    // Don't clear message here, let the next action handle it
    voteButtons.forEach(btn => btn.disabled = false);
    emailInput.disabled = false;
}

// Function to PERMANENTLY lock controls after duplicate vote
function lockControlsPermanently(finalMessage) {
    showMessage(finalMessage, 'error'); // Show final reason in main area
    voteButtons.forEach(btn => {
        btn.disabled = true;
        // Optional: Change button text
        // btn.textContent = 'Voted';
    });
    emailInput.disabled = true;
    // Optional: Add a class to the container for further styling
    // document.querySelector('.container').classList.add('voting-locked');
}

// --- Voting Logic ---

async function handleVote(event) {
    const button = event.target;
    const memeId = button.dataset.memeId;
    const email = emailInput.value.trim();

    if (!email || !email.includes('@') || !email.includes('.')) {
        showMessage('Please enter a valid email address.', 'error');
        emailInput.focus();
        return;
    }

    // disableVoting(`Voting for ${memeId}...`);
    disableControlsTemporarily(`Voting for ${memeId}...`);

    try {
        const response = await fetch('/api/vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Send the specific email used for this attempt
            body: JSON.stringify({ email: email, memeId: memeId }),
        });

        let result = {};
        try {
            result = await response.json();
        } catch (jsonError) {
            console.warn("Could not parse JSON response:", jsonError);
            result.message = `Server returned status ${response.status}, but no details.`;
        }

        if (response.ok) { // Status 200-299 (specifically 201 Created in our case)
            const successMsg = result.message || `Thank you for voting for ${memeId}!`;
            showMessage(successMsg, 'success'); // Show in main area
            showSnackbar(successMsg, 'success', 4000); // Show snackbar (longer duration 
            // Keep buttons disabled after successful vote? Your choice.
            // To re-enable after success (allowing different email): enableVoting();
            // To keep disabled: leave as is (buttons already disabled by disableVoting)
            // Let's keep them disabled after success for now.
            // emailInput.disabled = true; // Keep email disabled too

        } else {
            let errorMsg = result.message || `Error: ${response.statusText} (${response.status})`;
            // Handle specific errors based on status code
            if (response.status === 409) { // 409 Conflict - Duplicate Vote
                // Use the email from the input field for the message
                errorMsg = result.message || `You have already voted using ${email}.`;
                // LOCK controls permanently and show messages
                lockControlsPermanently(errorMsg);
                showSnackbar(errorMsg, 'error', 5000);
            } else {
                if (response.status === 400) { // 400 Bad Request - Invalid Input server-side
                    errorMsg = result.message || 'Invalid input sent to server.';
                }
                showMessage(errorMsg, 'error'); // Show error in main message area
                showSnackbar(errorMsg, 'error'); // Show error in snackbar
                // RE-ENABLE controls so user can fix input or try again
                enableControls();
            }
        }

    } catch (error) {
        console.error('Network or fetch error:', error);
        const networkErrorMsg = 'Could not connect to the server. Please try again later.';
        showMessage(networkErrorMsg, 'error');
        showSnackbar(networkErrorMsg, 'error');
        // Re-enable buttons and email input on network errors
        enableControls();
    }
}

function showMessage(message, type = 'info') {
    messageArea.textContent = message;
    // Assign class based on type for CSS styling
    messageArea.className = ''; // Clear previous classes
    if (message) { // Only add class if there's a message
        messageArea.classList.add(`message-${type}`);
    }
}

function disableVoting(message = 'Processing...', showLoadingText = true) {
    // Clear any previous message ONLY when starting a new attempt
    if (showLoadingText) {
        showMessage(message, 'loading'); // Show loading message (this replaces old error/success)
    } else {
        showMessage(''); // Clear message explicitly if not showing loading text
    }
    voteButtons.forEach(btn => btn.disabled = true);
    emailInput.disabled = true;
}

function enableVoting() {
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