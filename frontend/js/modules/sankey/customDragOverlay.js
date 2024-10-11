// We use a custom drag because the built-in one in Plotly is far from perfect. 
// It lacks throttling and debouncing, and the dragging function is called too frequently.
export function createDragOverlay() {
    const sankeyContainer = document.querySelector('.sankey-container');
    const dragOverlay = document.createElement('div');
    dragOverlay.style.position = 'absolute';
    dragOverlay.style.userSelect = 'none';
    dragOverlay.style.webkitUserSelect = 'none';
    dragOverlay.style.mozUserSelect = 'none';
    dragOverlay.style.msUserSelect = 'none';
    dragOverlay.style.top = 0;
    dragOverlay.style.left = 0;
    dragOverlay.style.width = '100%';
    dragOverlay.style.height = '100%';
    dragOverlay.style.cursor = 'grabbing';
    dragOverlay.style.background = 'transparent';
    dragOverlay.style.display = 'none';
    dragOverlay.style.zIndex = -1000;
    sankeyContainer.appendChild(dragOverlay);
                
    let isDragging = false;
    let startX, startY;
    let startScrollLeft, startScrollTop;
    let lastX, lastY;
    let animationFrameId = null;

    const debouncedEnableHoverEffects = debounce(enableHoverEffects, 100);

    function updateScroll() {
        if (!isDragging) return;
    
        const dx = lastX - startX;
        const dy = lastY - startY;
        sankeyContainer.scrollLeft = startScrollLeft - dx;
        sankeyContainer.scrollTop = startScrollTop - dy;
    
        animationFrameId = requestAnimationFrame(updateScroll);
    }                    

    function startDragging(event) {
        if (event.button !== 0) return;
        event.preventDefault();

        isDragging = true;
        startX = lastX = event.pageX;
        startY = lastY = event.pageY;
        startScrollLeft = sankeyContainer.scrollLeft;
        startScrollTop = sankeyContainer.scrollTop;

        dragOverlay.style.display = 'block';
        dragOverlay.style.cursor = 'grabbing';
        disableHoverEffects();

        document.addEventListener('mousemove', throttledMouseMove);
        document.addEventListener('mouseup', stopDragging);

        animationFrameId = requestAnimationFrame(updateScroll);
    }

    function onMouseMove(event) {
        if (!isDragging) return;
        lastX = event.pageX;
        lastY = event.pageY;
    }
    
    const throttledMouseMove = throttle(onMouseMove, 1);

    function stopDragging() {
        if (!isDragging) return;

        isDragging = false;
        dragOverlay.style.display = 'none';
        dragOverlay.style.cursor = 'grab';
        enableHoverEffects();

        document.removeEventListener('mousemove', throttledMouseMove);
        document.removeEventListener('mouseup', stopDragging);

        debouncedEnableHoverEffects();

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    }

    if (navigator.currentView === 'quarter') {
        sankeyContainer.removeChild(dragOverlay);
    }

    sankeyContainer.addEventListener('mousedown', startDragging);
}

const debounce = (func, delay) => {
    let inDebounce;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(inDebounce);
        inDebounce = setTimeout(() => func.apply(context, args), delay);
    }
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function disableHoverEffects() {
    Plotly.relayout('sankeyDiagram', {
        'hovermode': false
    });
}

function enableHoverEffects() {
    Plotly.relayout('sankeyDiagram', {
        'hovermode': 'closest'
    });
}