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
        return localStorage.getItem('fina_theme');
    }

    static saveTheme(t) {
        localStorage.setItem('fina_theme', t);
    }

    static getAccent() {
        return localStorage.getItem('fina_accent');
    }

    static saveAccent(c) {
        localStorage.setItem('fina_accent', c);
    }
}
