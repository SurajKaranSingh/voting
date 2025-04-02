const topVotedDiv = document.getElementById('top-voted-memes');
const voteDetailsDiv = document.getElementById('vote-details');
const totalVotesSpan = document.getElementById('total-votes');
const loadingMessage = document.getElementById('loading-message');
const resultContainer = document.querySelector('.result-container');

async function loadResults() {
    try {
        const response = await fetch('/api/results');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const results = await response.json();

        // Hide loading message and show results container
        loadingMessage.style.display = 'none';
        resultContainer.style.display = 'flex';

        // Display Total Votes
        totalVotesSpan.textContent = results.totalVotes || 0;

        // Display Top Voted Memes
        let topHtml = '';
        if (results.voteCounts && results.voteCounts.length > 0) {
            results.voteCounts.forEach((item, index) => {
                topHtml += `<p>${index + 1}. <span class="highlight">${item._id}</span> - ${item.count} vote(s)</p>`;
            });
        } else {
            topHtml = '<p>No votes recorded yet.</p>';
        }
        topVotedDiv.innerHTML = '<h3>🏆 Top Voted Memes</h3>' + topHtml; // Keep the title


        // Display All Vote Details (Optional)
        let detailsHtml = '';
        if (results.allVotes && results.allVotes.length > 0) {
            // Sort by timestamp descending (most recent first)
            results.allVotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            results.allVotes.forEach(vote => {
                // Format timestamp for readability
                const timestamp = new Date(vote.timestamp).toLocaleString();
                detailsHtml += `<p>${vote.email} voted for <span class="highlight">${vote.memeId}</span> on ${timestamp}</p>`;
            });
        } else {
            detailsHtml = '<p>No votes recorded yet.</p>';
        }
        // Keep the title and update count
        voteDetailsDiv.innerHTML = `<h3>🗳️ All Votes (<span id="total-votes">${results.totalVotes || 0}</span>)</h3>` + detailsHtml;


    } catch (error) {
        console.error('Error fetching results:', error);
        loadingMessage.textContent = 'Error loading results. Please try refreshing the page.';
        loadingMessage.style.color = '#dc3545'; // Error color
        resultContainer.style.display = 'none'; // Hide container on error
    }
}

// Load results when the page loads
loadResults();

// Optional: Refresh results every 30 seconds
// setInterval(loadResults, 30000);