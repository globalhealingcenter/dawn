function updateRebuyEmptyCartUrl() {
    var host = window.location.hostname.toLowerCase();

    var url = 'https://globalhealing.com/collections/collections';

    if (host.includes('globalhealing.co.uk')) {
        url = 'https://globalhealing.co.uk/collections/products-for-uk';
    } else if (host.includes('globalhealing.ca')) {
        url = 'https://globalhealing.ca/collections/international';
    }

    document.querySelectorAll('.rebuy-cart__flyout-empty-cart a, .rebuy-cart a').forEach(function (link) {
        if (link.textContent.trim().toLowerCase().includes('shop now')) {
            link.href = url;
        }
    });
}

document.addEventListener('DOMContentLoaded', updateRebuyEmptyCartUrl);
document.addEventListener('rebuy:smartcart.show', updateRebuyEmptyCartUrl);
document.addEventListener('rebuy:cart.change', updateRebuyEmptyCartUrl);

setTimeout(updateRebuyEmptyCartUrl, 1000);
setTimeout(updateRebuyEmptyCartUrl, 2000);