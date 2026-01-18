/* =========================
 Sidebar menu animation js 
=========================== */
const sidebarAnimation = {
  elements: null,

  init() {
    try {
      // Add small delay to ensure DOM is fully ready, especially on mobile devices
      setTimeout(() => {
        this.cacheElements();
        this.bindEvents();
      }, 100);
    } catch (error) {
      console.error('Sidebar animation initialization failed:', error);
    }
  },

  cacheElements() {
    this.elements = {
      navHamburger: document.querySelector('.nav-hamburger'),
      navHamburgerClose: document.querySelector('.nav-hamburger-close'),
      sidebar: document.querySelector('.sidebar'),
      subMenu: document.querySelectorAll('.sub-menu'),
    };
  },

  hasRequiredElements() {
    // Check if we have at least the basic sidebar functionality
    return this.elements && (
      (this.elements.navHamburger && this.elements.sidebar) ||
      this.elements.subMenu.length > 0
    );
  },

  bindEvents() {
    // Exit early if no required elements exist
    if (!this.hasRequiredElements()) {
      return;
    }

    const { navHamburger, navHamburgerClose, subMenu } = this.elements;

    if (navHamburger && this.elements.sidebar) {
      // Better mobile event handling to prevent conflicts
      let touchHandled = false;

      const openSidebar = (e) => {
        e.preventDefault();
        if (this.elements.sidebar) {
          this.elements.sidebar.classList.add('show-sidebar');
          document.body.classList.add('overflow-hidden');
        }
      };

      const handleTouchStart = (e) => {
        touchHandled = true;
        openSidebar(e);
        // Reset flag after short delay
        setTimeout(() => { touchHandled = false; }, 300);
      };

      const handleClick = (e) => {
        if (!touchHandled) {
          openSidebar(e);
        }
      };

      navHamburger.addEventListener('touchstart', handleTouchStart, { passive: false });
      navHamburger.addEventListener('click', handleClick);
    }

    if (navHamburgerClose && this.elements.sidebar) {
      // Better mobile event handling to prevent conflicts
      let touchHandled = false;

      const closeSidebar = (e) => {
        e.preventDefault();
        if (this.elements.sidebar) {
          this.elements.sidebar.classList.remove('show-sidebar');
          document.body.classList.remove('overflow-hidden');
        }
      };

      const handleTouchStart = (e) => {
        touchHandled = true;
        closeSidebar(e);
        // Reset flag after short delay
        setTimeout(() => { touchHandled = false; }, 300);
      };

      const handleClick = (e) => {
        if (!touchHandled) {
          closeSidebar(e);
        }
      };

      navHamburgerClose.addEventListener('touchstart', handleTouchStart, { passive: false });
      navHamburgerClose.addEventListener('click', handleClick);
    }

    // Close sidebar when clicking/tapping outside of it (mobile UX pattern)
    document.addEventListener('click', (e) => {
      if (this.elements.sidebar && this.elements.sidebar.classList.contains('show-sidebar')) {
        const isClickInsideSidebar = this.elements.sidebar.contains(e.target);
        const isClickOnHamburger = this.elements.navHamburger && this.elements.navHamburger.contains(e.target);

        if (!isClickInsideSidebar && !isClickOnHamburger) {
          this.elements.sidebar.classList.remove('show-sidebar');
          document.body.classList.remove('overflow-hidden');
        }
      }
    });

    // Handle touch events for closing sidebar
    document.addEventListener('touchstart', (e) => {
      if (this.elements.sidebar && this.elements.sidebar.classList.contains('show-sidebar')) {
        const isTouchInsideSidebar = this.elements.sidebar.contains(e.target);
        const isTouchOnHamburger = this.elements.navHamburger && this.elements.navHamburger.contains(e.target);

        if (!isTouchInsideSidebar && !isTouchOnHamburger) {
          this.elements.sidebar.classList.remove('show-sidebar');
          document.body.classList.remove('overflow-hidden');
        }
      }
    }, { passive: true });

    // Handle subMenu interactions with error checking
    if (subMenu && subMenu.length > 0) {
      subMenu.forEach((menu) => {
        if (menu) {
          menu.addEventListener('click', () => {
            if (menu.classList && menu.nextElementSibling && menu.children && menu.children[1]) {
              menu.classList.toggle('active-menu');
              menu.nextElementSibling.classList.toggle('hidden');
              menu.children[1].classList.toggle('rotate-90');

              subMenu.forEach((otherMenu) => {
                if (otherMenu !== menu && otherMenu.classList && otherMenu.nextElementSibling && otherMenu.children && otherMenu.children[1]) {
                  otherMenu.nextElementSibling.classList.add('hidden');
                  otherMenu.children[1].classList.remove('rotate-90');
                  otherMenu.classList.remove('active-menu');
                }
              });
            }
          });
        }
      });
    }
  },
};

if (typeof window !== 'undefined') {
  sidebarAnimation.init();
}
