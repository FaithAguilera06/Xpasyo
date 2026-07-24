document.getElementById('openPopup').onclick = function() {
    document.getElementById('popup').style.display = 'block';
}
document.querySelector('.close').onclick = function() {
    document.getElementById('popup').style.display = 'none';
}
window.onclick = function(event) {
    if (event.target == document.getElementById('popup')) {
        document.getElementById('popup').style.display = 'none';
    }
}