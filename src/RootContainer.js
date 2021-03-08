import React from 'react';
import StreamContainer from './StreamContainer.js';
import ScheduleContainer from './ScheduleContainer.js';
import ApplyContainer from './ApplyContainer.js';

// constants

// Maximum screen width for mobile site, in px
const MAX_MOBILE_WIDTH = 900;

// comment server backends
const BACKEND_URL       = "https://server.badradio.biz:5000";
const THEME_ENDPOINT    = `${BACKEND_URL}/theme`;

// polling intervals:
//  check every 5 seconds for new theme
const THEME_POLL_INTERVAL           = 5000;

const THEMES = {
    "classic": ["#000000", "#FFFFFF"],
    "toxic-sludge": ["#000000", "#49FC03"],
    "night-peach": ["#302A5C", "#F2CCC2"],
    "badboy-endless": ["#000000", "#FF4D00"],
    "solid-gold": ["#000000", "#FFD700"],
    "halloween-experience": ["#262626", "#FFA07A"],
    "pomegranate-visions": ["#692D2F", "#DDB5A7"],
    "turquoise-tortoise": ["#033A48", "#D99B9B"],
    "scoobydoo-alienencounter": ["#07023A", "#BDB663"],
    "poolside-underwater": ["#9DC7AF", "#03324C"],
    "purple-reign": ["#473946", "#BF801E"],
    "grapefruit-stone": ["#DF725D", "#393C44"],
    "forest-florist": ["#40572E", "#FBD6E4"],
    "abba-vacation": ["#066A98", "#D7C8F0"],
    "unreadably-cute": ["#8778F9", "#F7E0FE"],
    "meadowtations": ["#FFCC00", "#CC0000"], 
    "lumbersexual": ["#003300", "#CC0000"],
    "saint-valentine": ["#FF9999", "#CC0033"],
    "meadowtations-dark-mode": ["#CC0000", "#FFCC00"],
    "tea-shop": ["#DFCDCA", "#363D34"]
};
const DEFAULT_THEME = "classic";

// RootContainer - React class that renders all subclasses and polls comment & theme endpoints
class RootContainer extends React.Component {
    // scheduled async functions
    
    // polls theme endpoint and updates internal theme state element
    // no return
    pollTheme() {
        fetch(THEME_ENDPOINT)
        .then(response => response.json())
        .then(theme => {
            if (theme !== this.state.theme && theme in THEMES) {
                [document.body.style.backgroundColor, document.body.style.color] = THEMES[theme];
            }
            this.setState({theme: theme})
        });
    }

    checkMobile() {
        return document.body.offsetWidth <= MAX_MOBILE_WIDTH;
    }

    // update CSS variables on window resize & call child callbacks for further resize actions
    resizeWindow() {
        let vw = window.innerWidth * 0.01;
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vw', `${vw}px`);
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        this.setState({mobile: this.checkMobile()});
        this.state.childResizeCallbacks.map(cb => cb());
    }
            
    constructor(props) {
        super(props);
        this.state = {
            mobile: this.checkMobile(),

            selectedNav:    "stream",
            selectedFlier:  null,

            theme:          DEFAULT_THEME,
            themeInterval:  null,

            childResizeCallbacks:   []
        };
    }

    componentDidMount() {
        this.resizeWindow();
        document.body.onresize = this.resizeWindow.bind(this);

        this.pollTheme();
        this.setState({
            themeInterval: setInterval(this.pollTheme.bind(this), THEME_POLL_INTERVAL)
        });
    }

    registerResizeCallback(cb) {
        let cbs = this.state.childResizeCallbacks.concat(cb);
        this.setState({childResizeCallbacks: cbs});
    }

    // set selected nav element
    handleNavClick(navElem) {
        this.deselectFlier();
        this.setState({selectedNav: navElem});
    }

    selectFlier(flierURL) {
        console.log(flierURL);
        this.setState({selectedFlier: flierURL});
    }

    // dismiss selected flier
    deselectFlier() {
        this.setState({selectedFlier: null});
    }
    
    render() {

        // I know it's not the most "reactive" method to toggle CSS display visibility instead of conditional rendering, but
        // a)   I need invisibile elements tied to one of the content frames to still be present in the background (specifically the radio player)
        // b)   I really don't want internal load times for a website this simple 
        let streamContainer = (<StreamContainer mobile={this.state.mobile} theme={this.state.theme} style={this.state.selectedNav === "stream" ? {} : {display: "none"}} registerResizeCallback={this.registerResizeCallback.bind(this)}/>);
        let scheduleContainer = (<ScheduleContainer mobile={this.state.mobile} selectCallback={this.selectFlier.bind(this)} style={this.state.selectedNav === "schedule" ? {} : {display: "none"}}/>);
        let applyContainer = (<ApplyContainer style={this.state.selectedNav === "apply" ? {} : {display: "none"}}/>)
        
        return (
            <>
                <div id="header" className="borderbottom">
                    <img id="headerimg" className="themeresponsiveimg" onClick={this.handleNavClick.bind(this, "stream")} src={`img/logo-${this.state.theme}.png`} />
                </div>
                <div id="navbar" className="borderbottom">
                    <div id="streamnavcontainer" className="navelem link" onClick={this.handleNavClick.bind(this, "stream")} >
                        <a id="streamnav">STREAM</a>
                    </div>
                    <div className="navelem link" onClick={this.handleNavClick.bind(this, "schedule")} >
                        <a id="schedulenav">SCHEDULE</a>
                    </div>
                    <div className="navelem link" onClick={this.handleNavClick.bind(this, "apply")} >
                        <a id="applynav">APPLY</a>
                    </div>
                </div>
                <a id="acabmarqueecontainer" className="marqueecontainer borderbottom link fginborder" style={{borderColor: THEMES[this.state.theme][1]}} href="https://secure.actblue.com/donate/blacktrans-queer" target="_blank">
                    <div id="acabmarquee" className="marquee pixelfont" style={{animationDuration: "54.25s"}} >
                        •<span className="innerstatus pixelfont">BLACK LIVES MATTER</span>•<span className="innerstatus pixelfont">CLICK HERE TO DONATE TO BLACK TRANS ORGANIZATIONS NATIONWIDE</span>•<span className="innerstatus pixelfont">BADNEFIT RADIOTHON</span>•<span className="innerstatus pixelfont">MARCH 27TH</span>•<span className="innerstatus pixelfont">NOON TO MIDNIGHT CST</span>
                        •<span className="innerstatus pixelfont">BLACK LIVES MATTER</span>•<span className="innerstatus pixelfont">CLICK HERE TO DONATE TO BLACK TRANS ORGANIZATIONS NATIONWIDE</span>•<span className="innerstatus pixelfont">BADNEFIT RADIOTHON</span>•<span className="innerstatus pixelfont">MARCH 27TH</span>•<span className="innerstatus pixelfont">NOON TO MIDNIGHT CST</span>
                    </div>
                </a>
                <div id="contentcontainer">
                    {streamContainer}
                    {scheduleContainer}
                    {applyContainer}
                </div>
                { this.state.selectedFlier ? <FlierWindow selectedFlier={this.state.selectedFlier} deselectCallback={this.deselectFlier.bind(this)} /> : null }
            </>
        );
    }
}


let FlierWindow = props => (
    <div id="flierwindow" onClick={props.deselectCallback} className="modal">
        <div id="fliercontent" className="modal-content">
            <div id="flierimgcontainer">
                <img id="flierimg" src={props.selectedFlier} style={{maxHeight: `${(window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight) - 80}px`}}/>
                <span className="modal-close" onClick={props.deselectCallback}>&times;</span>
            </div>
        </div>
    </div>
);

export default RootContainer;
export { THEMES };
