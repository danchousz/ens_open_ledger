import { isDesktop } from '../globalVars.js';
import { showRecipientDetails } from '../tables/recipientDetails.js';
import { searchRestrictions } from './searchExceptions.js';

async function tryFindAvatar(name) {
    const formats = ['jpg', 'png', 'svg', 'gif', 'webp'];
    const folders = ['avatars', 'static_avatars'];
    let avatarUrl = '';

    for (const folder of folders) {
        for (const format of formats) {
            try {
                const response = await fetch(`/${folder}/${encodeURIComponent(name)}.${format}`);
                if (response.ok) {
                    avatarUrl = `/${folder}/${encodeURIComponent(name)}.${format}`;
                    return avatarUrl;
                }
            } catch {
                continue;
            }
        }
    }

    return `https://avatars.jakerunzer.com/${encodeURIComponent(name)}`;
}

export function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    const magnifyPlaceholder = document.getElementById('Magnify');

    if (!isDesktop) {
        searchInput.style.display = 'none';
        magnifyPlaceholder.style.display = 'none';
        return;
    }

    const searchContainer = document.createElement('div');
    searchContainer.style.position = 'relative';
    searchContainer.style.width = '100%';
    
    const inputWrapper = document.createElement('div');
    inputWrapper.style.position = 'relative';
    inputWrapper.style.width = '100%';
    
    const searchIcon = document.createElement('img');
    searchIcon.src = '/components/icons/MagnifyingGlass.svg';
    searchIcon.style.cssText = `
        position: absolute;
        left: 0.8vw;
        top: 50%;
        transform: translateY(-50%);
        width: 1.2vw;
        height: 1.2vw;
        pointer-events: none;
    `;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '0x or Name';
    input.style.cssText = `
        width: calc(100% - 2.5vw);
        height: 6vh;
        padding-left: 2.5vw;
        border: none;
        color: #4a5568;
        background-color: #fafafa;
        font-size: 1.14vw;
        line-height: 1.5;
        border-radius: 0.57vw;
    `;
    
    const dropdown = document.createElement('div');
    dropdown.style.cssText = `
        display: none;
        position: absolute;
        bottom: 100%;
        left: 0;
        width: 100%;
        background: white;
        border-radius: 0.57vw;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        margin-bottom: 0.5vh;
        max-height: 30vh;
        overflow-y: auto;
        z-index: 1000;
    `;

    let debounceTimer;
    
    input.addEventListener('input', async (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const searchTerm = e.target.value;
            
            if (searchTerm.length > 0) {
                try {
                    const response = await fetch(`/api/search?term=${encodeURIComponent(searchTerm)}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const suggestions = await response.json();

                    const filteredSuggestions = suggestions.filter(suggestion => 
                        !searchRestrictions.includes(suggestion.name)
                    );                
                    
                    dropdown.innerHTML = '';
                    
                    if (filteredSuggestions && filteredSuggestions.length > 0) {
                        for (const suggestion of filteredSuggestions) {
                            const suggestionElement = document.createElement('div');
                            suggestionElement.style.cssText = `
                                display: flex;
                                align-items: center;
                                padding: 0.8vh 0.8vw;
                                cursor: pointer;
                                transition: background-color 0.2s;
                                height: 6vh;
                                box-sizing: border-box;
                            `;
                            
                            const avatar = document.createElement('img');
                            avatar.className = `avatar-${suggestion.name}`;
                            avatar.style.cssText = `
                                width: 4vh;
                                height: 4vh;
                                border-radius: 50%;
                                margin-right: 0.71vw;
                                object-fit: cover;
                            `;
                            avatar.src = await tryFindAvatar(suggestion.name);
                            avatar.onerror = () => {
                                avatar.src = `https://avatars.jakerunzer.com/${encodeURIComponent(suggestion.name)}`;
                            };
                            
                            const textContainer = document.createElement('div');
                            textContainer.style.cssText = `
                                display: flex;
                                flex-direction: column;
                                overflow: hidden;
                            `;
                            
                            const name = document.createElement('span');
                            name.textContent = suggestion.name;
                            name.style.cssText = `
                                font-size: 1.14vw;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                            `;
                            
                            if (suggestion.address) {
                                const address = document.createElement('span');
                                address.textContent = suggestion.address;
                                address.style.cssText = `
                                    font-size: 0.9vw;
                                    color: #666;
                                    white-space: nowrap;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                `;
                                textContainer.appendChild(name);
                                textContainer.appendChild(address);
                            } else {
                                textContainer.appendChild(name);
                            }
                            
                            suggestionElement.appendChild(avatar);
                            suggestionElement.appendChild(textContainer);
                            
                            suggestionElement.addEventListener('mouseover', () => {
                                suggestionElement.style.backgroundColor = '#f0f0f0';
                            });
                            
                            suggestionElement.addEventListener('mouseout', () => {
                                suggestionElement.style.backgroundColor = 'transparent';
                            });
                            
                            suggestionElement.addEventListener('click', () => {
                                showRecipientDetails(suggestion.name, false);
                                dropdown.style.display = 'none';
                                input.value = '';
                            });
                            
                            dropdown.appendChild(suggestionElement);
                        }
                        
                        dropdown.style.display = 'block';
                } else {
                    dropdown.innerHTML = `
                        <div style="padding: 0.8vh 0.8vw; text-align: center; color: #666; height: 6vh; line-height: 4.4vh;">
                            No results found
                        </div>
                    `;
                    dropdown.style.display = 'block';
                }
            } catch (error) {
                console.error('Search error:', error);
                dropdown.innerHTML = `
                    <div style="padding: 1vh 0.8vw; text-align: center; color: #666;">
                        Error loading results
                    </div>
                `;
                dropdown.style.display = 'block';
            }
        } else {
            dropdown.style.display = 'none';
        }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            dropdown.style.display = 'none';
            input.blur();
        }
     });
     
     input.addEventListener('focus', () => {
        if (input.value.length > 0) {
            dropdown.style.display = 'block';
        }
     });

    inputWrapper.appendChild(searchIcon);
    inputWrapper.appendChild(input);
    searchContainer.appendChild(inputWrapper);
    searchContainer.appendChild(dropdown);
    
    searchInput.parentNode.replaceChild(searchContainer, searchInput);
}