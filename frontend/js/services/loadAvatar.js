function loadAvatar(counterparty) {
    const avatarImgs = document.querySelectorAll(`.avatar-${CSS.escape(counterparty)}`);
    if (avatarImgs.length === 0) return;

    const formats = ['jpg', 'png', 'svg', 'gif', 'webp'];
    const folders = ['avatars', 'static_avatars'];

    async function tryLoadAvatar() {
        for (const folder of folders) {
            for (const format of formats) {
                    const response = await fetch(`/${folder}/${encodeURIComponent(counterparty)}.${format}`);
                    if (response.ok) {
                        const avatarUrl = `/${folder}/${encodeURIComponent(counterparty)}.${format}`;
                        avatarImgs.forEach(img => {
                            img.src = avatarUrl;
                            img.onerror = () => {
                                img.src = `https://avatars.jakerunzer.com/${encodeURIComponent(counterparty)}`;
                            };
                        });
                        return;
                    }
            }
        }

        avatarImgs.forEach(img => {
            img.src = `https://avatars.jakerunzer.com/${encodeURIComponent(counterparty)}`;
        });
    }

    tryLoadAvatar().catch(error => {
        avatarImgs.forEach(img => {
            img.src = `https://avatars.jakerunzer.com/${encodeURIComponent(counterparty)}`;
        });
    });
}

export function loadAllAvatars() {
    const uniqueCounterparties = new Set();
    document.querySelectorAll('[class^="avatar-"]').forEach(img => {
        const counterparty = img.className.split('avatar-')[1];
        uniqueCounterparties.add(counterparty);
    });

    uniqueCounterparties.forEach(loadAvatar);
}