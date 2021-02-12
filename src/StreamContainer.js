import React from 'react';
import _, {THEMES} from './RootContainer';

// constants

// radio server URL
const RADIO_URL         = "http://server.badradio.biz:8000";
const STREAM_ENDPOINT   = `${RADIO_URL}/stream`;
const AMBIENT_ENDPOINT  = `${RADIO_URL}/ambient`;
const STATUS_ENDPOINT   = `${RADIO_URL}/status-json.xsl`;

// comment server URL
const BACKEND_URL               = "https://server.badradio.biz:5000";
const COMMENT_GET_ENDPOINT      = `${BACKEND_URL}/comments`;
const COMMENT_POST_ENDPOINT     = `${BACKEND_URL}/new`;

// polling intervals:
//  check every 5 seconds for stream status
//  check every 10 seconds to see if comments have been enabled
//  check every second for new comments if so
const STATUS_POLL_INTERVAL          = 5000;
const NULL_COMMENT_POLL_INTERVAL    = 10000;
const ACTIVE_COMMENT_POLL_INTERVAL  = 1000;

// display names for all the fields for current show
const FIELD_DISPLAYS = {
    server_name         : "STREAM NAME", 
    server_description  : "STREAM DESCRIPTION", 
    stream_start        : "STREAM STARTED", 
    genre               : "GENRE", 
    server_url          : "STREAM URL", 
    title               : "CURRENTLY PLAYING"
};

// marquee elements move at 48 pixels per second
const MARQUEE_PPS = 48;

// minimum pixel distance from bottom of screen to auto-scroll to newest comment
const COMMENT_AUTOSCROLL_THRESHOLD = 100;

class StreamContainer extends React.Component {
    // scheduled async functions

    // polls icecast server for current status
    pollStatus() {
        fetch(STATUS_ENDPOINT)
        // there are certain versions of Icecast that don't return valid JSON for certain song name inputs - huge issue! so this regex resolves it
        .then(response => response.text())
        .then(text => JSON.parse(text.replace(/([^\\])([\"\']): *- *,([\"\'])/g, "$1$2:\"-\",$3")))
        .then(streamInfoContainer => {
            let streamInfo = streamInfoContainer['icestats']['source'];
            let showPlaying = false;
            if (Array.isArray(streamInfo)) {
                let stream = streamInfo.find(element => ('listenurl' in element && element['listenurl'] == STREAM_ENDPOINT));
                if (stream && 'stream_start' in stream) {
                    streamInfo = stream;
                    showPlaying = true;
                } else {
                    let ambient = streamInfo.find(element => ('listenurl' in element && element['listenurl'] == AMBIENT_ENDPOINT));
                    if (ambient && 'stream_start' in ambient) {
                        streamInfo = ambient;
                    } else {
                        streamInfo = {};
                    }
                }
            }
            if (streamInfo !== this.state.streamInfo || showPlaying !== this.state.showPlaying) {
                this.setState({streamInfo: streamInfo, showPlaying: showPlaying});
            }
        }).catch(err => {
            console.error(`Error parsing status JSON! ${err}`);
        });
    }

    // polls comment endpoint and updates internal comments state element
    pollComments() {
        fetch(COMMENT_GET_ENDPOINT)
        .then(response => response.json())
        .then(comments => {
            // update polling intervals on comment state change
            if ((comments && !this.state.comments) || (!comments && this.state.comments)) {
                if (this.state.commentInterval) {
                    clearInterval(this.state.commentInterval);
                }
                this.setState({commentInterval: setInterval(this.pollComments.bind(this), (comments ? ACTIVE_COMMENT_POLL_INTERVAL : NULL_COMMENT_POLL_INTERVAL))});
            }
            if (comments !== this.state.comments) {
                this.setState({comments: comments});
            }
        });
    }

    togglePlayState() {
        if (this.state.paused) {
            this.player.play();
        } else {
            this.player.pause();
            this.player.load();
        }
        this.setState({paused: !(this.state.paused)});
    }

    monitorPlayState() {
        if (this.player.paused != this.state.paused) {
            this.setState({paused: this.state.paused});
        }
    }

    // change volume (has no effect on mobile)
    iterateVolume() {
        let volume = (this.state.volume + 1) % 4;
        this.player.volume = volume / 3;
        // set state based on actual volume so that on platforms where volume can't be set 
        // (e.g. mobile browser) it doesn't display an improper value
        this.setState({volume: Math.round(this.player.volume * 3)});
    }

    handleFieldChange(fieldName, changeEvent) {
        this.setState({[fieldName]: changeEvent.target.value});
    }

    // I need to set player size in a way that's not easily accomplished in pure CSS, so I register a callback with the parent on window resize
    handleWindowResize() {
        if (this.playButtonElem && this.playButtonElem.offsetHeight) {
            this.setState({playButtonWidth: `${this.playButtonElem.offsetHeight}px`});
        }
        if (this.volumeButtonElem && this.volumeButtonElem.offsetHeight) {
            this.setState({volumeButtonWidth: `${this.volumeButtonElem.offsetHeight}px`});
        }
        if (this.radioPlayerElem && this.playButtonElem && this.volumeButtonElem) {
            this.setState({radioStatusWidth: `${this.radioPlayerElem.offsetWidth - this.playButtonElem.offsetHeight - this.volumeButtonElem.offsetHeight - 30}px`});
        }
    }
    
    submitComment(event) {
        if (event._reactName === "onClick" || event.keyCode === 13) {
            this.setState({submittingComment: true});
            fetch(COMMENT_POST_ENDPOINT, {
                method: "POST",
                headers:    {
                    'Content-Type'  : "application/x-www-form-urlencoded"
                },
                body:   `name=${encodeURIComponent(this.state.commentName)}&comment=${encodeURIComponent(this.state.commentText)}`
            }).then(response => response.text())
            .then(response => {
                if (response !== "comment successfully added") {
                    alert(response);
                } else {
                    this.setState({commentText: ""});
                }
                setTimeout(() => this.setState({submittingComment: false}), 500);
            });
        }
    }

    // generic React element ref callback
    elementRefCallback(elementName, ref) {
        this[elementName] = ref;
    }

    constructor(props) {
        super(props);

        this.state = {
            paused:         true,
            volume:         3,

            streamInfo:     null,
            statusInterval: null,
            showPlaying:    false,

            comments:               null,
            commentInterval:        null,
            submittingComment:      false,
            lastAutoscrollHeight:   0,

            commentName:        "",
            commentText:        "",

            playButtonWidth:    "0px",
            volumeButtonWidth:  "0px",
            radioStatusWidth:   "0px",

            statusAnimationDuration:    "0s"
        };

        props.registerResizeCallback(this.handleWindowResize.bind(this));
    }

    componentDidMount() {
        this.handleWindowResize();
    
        this.pollStatus();
        this.pollComments();
        this.setState({
            statusInterval:     setInterval(this.pollStatus.bind(this), STATUS_POLL_INTERVAL),
            commentInterval:    setInterval(this.pollComments.bind(this), NULL_COMMENT_POLL_INTERVAL)
        });

        document.body.onkeyup = e => {
            if ((document.activeElement === null || document.activeElement === document.body) && e.keyCode == 32) {
                e.preventDefault();
                this.togglePlayState();
            }
        };
    }

    componentDidUpdate() {
        if (this.radioStatusElem) {
            let newAnimationDuration = `${this.radioStatusElem.offsetWidth / 2 / MARQUEE_PPS}s`;
            if (newAnimationDuration !== this.state.statusAnimationDuration) {
                this.setState({statusAnimationDuration: newAnimationDuration});
            }
        }

        // scroll latest comment into view if close and this comment hasn't been scrolled into view before
        if (this.commentContainerElem && this.commentParentElem && this.state.lastAutoscrollHeight != this.commentParentElem.offsetHeight && this.commentContainerElem.scrollTop + this.commentContainerElem.offsetHeight >= this.commentParentElem.offsetHeight - COMMENT_AUTOSCROLL_THRESHOLD) {
            this.commentContainerElem.scrollTo({top: this.commentParentElem.offsetHeight - this.commentContainerElem.offsetHeight, behavior: "smooth"});
            this.setState({lastAutoscrollHeight: this.commentParentElem.offsetHeight});
        }
    }

    componentWillUnmount() {
        clearInterval(this.statusInterval);
        clearInterval(this.pollInterval);
        document.body.onkeyup = null;
    }
 
    render() {

        // standard status text transform for null values
        let substituteNull = field => field.replace("(null)", "None").replace("\(?null\)? - \(?null\)?", "-")

        // applies defined transform for each value in stream info
        // or if no transform is defined for the field, the standard null substitution
        let textReplacementFunctions = {
            stream_start    : stream_start => (stream_start.substring(0, Math.max(0, stream_start.length - 6))),
            server_url      : server_url => substituteNull(server_url) === "None" ? "None" : (<div className="linkdiv"><a className="dottedLink" href={substituteNull(server_url).replace(/^(?!https?:\/\/)(.*)$/g, "http:\/\/$1")} target="_blank">{substituteNull(server_url)}</a></div>)
        }
        let processField = (fieldName, fieldValue) => {
            return (fieldValue ?
                (fieldName in textReplacementFunctions ? textReplacementFunctions[fieldName] : substituteNull)(fieldValue)
                : "None"
            );
        }

        let fieldDisplayElems = Object.keys(FIELD_DISPLAYS).map(fieldKey => (
            <React.Fragment key={this.state.streamInfo ? `${fieldKey}:${this.state.streamInfo[fieldKey]}` : `${fieldKey}empty`}>
                <div className="streamstatnames statnames pixelfont"> 
                    {FIELD_DISPLAYS[fieldKey]}
                </div>
                <div className="streamstats stats">
                    {this.state.streamInfo ? processField(fieldKey, this.state.streamInfo[fieldKey]) : "LOADING..."}
                </div>
            </React.Fragment>
        ));

        let commentDisplayElems = this.state.comments ? Object.keys(this.state.comments).map(commentId => (
            <div id={`comment${commentId}`} className="commentrow" key={`${commentId}:${this.state.comments[commentId]['name']}:${this.state.comments[commentId]['comment']}`} ref={this.elementRefCallback.bind(this, 'latestCommentElem')}>
                <div className="commentnamecontainer">
                    <a className="commentname pixelfont">{this.state.comments[commentId]['name']}</a>
                </div>
                <div className="commenttextcontainer">
                    <a className="commenttext">{this.state.comments[commentId]['comment']}</a>
                </div>
            </div>
        )) : null;

        let radioStatusTextElem = null;
        if (this.state.showPlaying) {
            radioStatusTextElem = [];
            [...Array(8).keys()].map(index => radioStatusTextElem.push(<div className="innerstatus" key={`innerstatus${index}`}>Live Now: <span className="pixelfont">{this.state.streamInfo['server_name']}</span>{(this.state.streamInfo['title'] && !(substituteNull(this.state.streamInfo['title']) in ["None", "-"])) ? ` playing ${this.state.streamInfo['title']}` : null}</div>));
        } else {
            radioStatusTextElem = (this.state.streamInfo ? (this.state.streamInfo['server_name'] || "Stream Offline") : "LOADING...");
        }

        return (
            <div id="streaminfocontainer" style={this.props.style}>
                <div id="streamcontainer" className="borderbottom">
                    <audio id="radiostream" src={STREAM_ENDPOINT} ref={this.elementRefCallback.bind(this, 'player')}></audio> 
                    <div id="radioplayer" ref={this.elementRefCallback.bind(this, 'radioPlayerElem')}>
                        <div id="radioplay" style={{backgroundColor: THEMES[this.props.theme][1], color: THEMES[this.props.theme][0], width: this.state.playButtonWidth}} onClick={this.togglePlayState.bind(this)} ref={this.elementRefCallback.bind(this, 'playButtonElem')}>
                            <img id="radioplayicon" className="themeresponsiveimg" src={`img/${this.state.paused ? "play" : "pause"}-${this.props.theme}.png`} />
                        </div>
                        <div id="radiostatuscontainer" className={this.state.showPlaying ? "marqueecontainer" : "nonmarquee"} style={{width: this.state.radioStatusWidth}} ref={this.elementRefCallback.bind(this, 'statusContainerElem')}>
                            <div id="radiostatus" className={this.state.showPlaying ? "marquee" : null} style={{animationDuration: this.state.statusAnimationDuration}} ref={this.elementRefCallback.bind(this, 'radioStatusElem')}>
                                {radioStatusTextElem}
                            </div>
                        </div>
                        <div id="radiovolume" style={{backgroundColor: THEMES[this.props.theme][1], color: THEMES[this.props.theme][0], width: this.state.volumeButtonWidth}} onClick={this.iterateVolume.bind(this)} ref={this.elementRefCallback.bind(this, 'volumeButtonElem')}>
                            <img id="radiovolumeicon" className="themeresponsiveimg" src={`img/volume-${this.state.volume}-${this.props.theme}.png`} />
                        </div>
                    </div>
                </div>
                <div id="infochatcontainer" className={this.state.comments ? null : "nocomments"}>
                    <div id="infocontainer" className={this.state.comments ? null : "nocomments"} key={this.state.comments ? "infocontainercomments" : "infocontainernocommments"} >
                        <div></div><div className="borderleft"></div>
                        {fieldDisplayElems}
                        <div></div><div className="borderleft"></div>
                    </div>
                    <div id="chatcontainer" className={this.state.comments ? null : "nocomments"}>
                        <div id="chatheader" className="borderbottom pixelfont">
                            CHAT
                        </div>
                        <div id="commentcontainer" className="borderbottom" ref={this.elementRefCallback.bind(this, 'commentContainerElem')}>
                            <div id="commentparent" ref={this.elementRefCallback.bind(this, 'commentParentElem')}>
                                {commentDisplayElems}
                            </div>
                        </div>
                        <div id={this.state.submittingComment ? "submittingcommenteditor" : "commenteditor"}>
                            {this.state.submittingComment ? (
                                <button id="commentsubmit" className="pixelfont" style={{backgroundColor: THEMES[this.props.theme][1], color: THEMES[this.props.theme][0]}}>SENDING...</button>
                            ) : (
                                <>
                                    <div id="nameinputcontainer" className="inputcontainer">
                                        <input type="text" id="namefield" name="namefield" className="input pixelfont" placeholder="NAME" onChange={this.handleFieldChange.bind(this, 'commentName')} value={this.state.commentName} />
                                    </div>
                                    <div className="inputcontainer borderleft">
                                        <input type="text" id="commentfield" name="commentfield" className="input tk-acumin-pro-wide" onChange={this.handleFieldChange.bind(this, 'commentText')} value={this.state.commentText} onKeyUp={this.submitComment.bind(this)} />
                                    </div>
                                    <button id="commentsubmit" className="pixelfont" style={{backgroundColor: THEMES[this.props.theme][1], color: THEMES[this.props.theme][0]}} onClick={this.submitComment.bind(this)}>SEND</button>
                                </>)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default StreamContainer;
