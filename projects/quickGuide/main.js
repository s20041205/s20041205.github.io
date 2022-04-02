class QuickGuideHeader extends HTMLElement {
    connectedCallback(){
        this.innerHTML =`
        <header>
            <nav class="navbar navbar-expand-lg navbar-light bg-light">
                <div class="container-fluid">
                <a class="navbar-brand" href="#">Instructions</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarScroll" aria-controls="navbarScroll" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarScroll">
                    <ul class="navbar-nav me-auto my-2 my-lg-0 navbar-nav-scroll" style="--bs-scroll-height: 100px;">
                    <li class="nav-item">
                        <a class="nav-link active" aria-current="page" href="/TX/tx.html">Overview</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="/TX/realtime.html">Real-Time</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="/TX/retriever.html">Retriever</a>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" id="navbarScrollingDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Others
                        </a>
                        <ul class="dropdown-menu" aria-labelledby="navbarScrollingDropdown">
                        <li><a class="dropdown-item" href="#">Language Pack</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#">Installation</a></li>
                        <li><a class="dropdown-item" href="#">Setup</a></li>
                        </ul>
                    </li>
                    </ul>
                    <form class="d-flex">
                    <input class="form-control me-2" type="search" placeholder="Search" aria-label="Search">
                    <button class="btn btn-outline-success" type="submit">Search</button>
                    </form>
                </div>
                </div>
            </nav>
        </header>
        `
    }
}
customElements.define('quick-guide-header', QuickGuideHeader)

class QuickGuideFooter extends HTMLElement {
    connectedCallback(){
        this.innerHTML =`
        <div>
            @2022 Instructions v1.0.4
        <div>
        `
    }
}
customElements.define('quick-guide-footer', QuickGuideFooter)