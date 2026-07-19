export class StorageManager {
    static getFavs() {
        return JSON.parse(localStorage.getItem('fina_favs') || '[]');
    }

    static saveFavs(favs) {
        localStorage.setItem('fina_favs', JSON.stringify(favs));
    }

    static clearFavs() {
        localStorage.removeItem('fina_favs');
    }

    static getTheme() {
        return localStorage.getItem('fina_lik');
    }

    static saveTheme(t) {
        localStorage.setItem('fina_lik', t);
    }

    static clearTheme() {
        localStorage.removeItem('fina_lik');
    }
}
