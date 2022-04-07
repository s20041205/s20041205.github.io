class QuickGuideHeader extends HTMLElement {
    connectedCallback(){
        this.innerHTML =`
        <div>
            <nav class="navbar navbar-expand-lg navbar-light bg-light">
                <div class="container-fluid">
                <a class="navbar-brand" href="index.html">Instructions</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarScroll" aria-controls="navbarScroll" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarScroll">
                    <ul class="navbar-nav me-auto my-2 my-lg-0 navbar-nav-scroll" style="--bs-scroll-height: 100px;">
                    <li class="nav-item">
                        <a class="nav-link active" aria-current="page" href="overview.html">Overview</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="realtime.html">Real-Time</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="retriever.html">Retriever</a>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" id="navbarScrollingDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Others
                        </a>
                        <ul class="dropdown-menu" aria-labelledby="navbarScrollingDropdown">
                        <li><a class="dropdown-item" href="#">Setup</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#">Language Pack</a></li>
                        <li><a class="dropdown-item" href="#">Installation</a></li>
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
        </div>
        `
    }
}
customElements.define('quick-guide-header', QuickGuideHeader)

class QuickGuideFooter extends HTMLElement {
    connectedCallback(){
        this.innerHTML =`
        <nav class="navbar fixed-bottom navbar-light bg-light">
            <div class="container-fluid">
            Last Modified: Apr. 7, 2022 <br>
            @2022 Instructions v1.0.10 
            </div>
        </nav>
        `
    }
}
customElements.define('quick-guide-footer', QuickGuideFooter)

var btn = $('#button');

$(window).scroll(function() {
  if ($(window).scrollTop() > 300) {
    btn.addClass('show');
  } else {
    btn.removeClass('show');
  }
});

btn.on('click', function(e) {
  e.preventDefault();
  $('html, body').animate({scrollTop:0}, '300');
});

