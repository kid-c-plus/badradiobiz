import React from 'react';

// constants

// url to pull schedule info from
const SCHEDULE_URI = "schedule.json";

// time hour at which to start printing shows out as part of the new day and not the night before
// here, anything before 3 AM will show under the column of the previous day
const DISPLAY_CHANGE_TIME = 3;

// lol
const WEEKDAYS = {
    0 : "sunday",
    1 : "monday",
    2 : "tuesday",
    3 : "wednesday",
    4 : "thursday",
    5 : "friday",
    6 : "saturday"
};

class ScheduleContainer extends React.Component {

    // async function that pulls schedule JSON from endpoint & adds to state
    loadSchedule() {
        fetch(SCHEDULE_URI)
        .then(response => response.json())
        .then(schedule => this.setState({schedule: schedule}));
    }

    // click handler for mobile schedule display
    // also resets scroll to top
    selectDay(day) {
        if (this.props.mobile) {
            this.setState({selectedDay: day});
            this.scheduleContainerElem.scrollTo(0, 0);
        }
    }

    // generic React element ref callback
    elementRefCallback(elementName, ref) {
        this[elementName] = ref;
    }

    constructor(props) {
        super(props);

        this.state = {
            schedule:       null,
            selectedDay:    null
        };
    }

    componentDidMount() {
        this.loadSchedule();
    }

    render() {

        // JSX element arrays
        let hours = null;
        let timeHeaders = null;
        let showEntries = null;

        // schedule has loaded
        if (this.state.schedule) {

            // get range of earliest to latest time to display
            let range = this.state.schedule.map(day => Object.keys(day).map(hour => parseInt(hour))).flat().sort((hour1, hour2) => ((hour1 + 24 - DISPLAY_CHANGE_TIME) % 24 - (hour2 + 24 - DISPLAY_CHANGE_TIME) % 24));
            let [start, end] = [range[0], range[range.length - 1]];

            // get full array of start time to end time, looping around midnight
            hours = [...Array(end > start ? end - start + 1 : end - start + 25).keys()].map(hour => (hour + start) % 24);

            // JSX array of <th> elements for each time
            timeHeaders = hours.map(hour => <th className="scheduletime" key={`hour${hour}`}>{hour < 12 ? (hour == 0 ? "12" : hour.toString()) : (hour - 12).toString()}:00 {hour < 12 ? "AM" : "PM"}</th>);

            // JSX array of 7 arrays of show <td> elements
            showEntries = [...Array(7).keys()].map(day => (
                hours.map(hour => (
                        <td className={WEEKDAYS[day]} key={`entry${day}:${hour}`}>
                            {hour in this.state.schedule[day] ? 
                                ("flierURL" in this.state.schedule[day][hour] ? (
                                    <div className="linkdiv">
                                        <a className="dottedlink" onClick={this.props.selectCallback.bind(this.props, this.state.schedule[day][hour]['flierURL'])}>
                                            {this.state.schedule[day][hour]['show']}
                                        </a>
                                    </div> 
                                ) : this.state.schedule[day][hour]['show'])
                            : "\u00a0" }
                        </td>
                ))
            ));
        }

        return (
            <div id="schedulecontainer" style={this.props.style} ref={this.elementRefCallback.bind(this, 'scheduleContainerElem')}>
                <table id="scheduletable">
                    <thead>
                        <tr>
                            {this.props.mobile && this.state.selectedDay !== null ? (
                                <td id={`${WEEKDAYS[this.state.selectedDay]}selector`} className="selector selectedselector" key="selectedmobileselector" onClick={this.selectDay.bind(this, null)}>{`${WEEKDAYS[this.state.selectedDay].toUpperCase()} (CST)`}</td>
                            ) : (
                                <>
                                    {this.props.mobile ? null : <th className="csttimes">CST times</th>}
                                    {[...Array(7).keys()].map(day => (<th id={`${WEEKDAYS[day]}selector`} className="selector" key={`${WEEKDAYS[day]}${this.props.mobile ? "mobile" : "desktop"}selector`} onClick={this.selectDay.bind(this, day)}>{WEEKDAYS[day].toUpperCase()}</th>))}
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {hours ? (
                            [...Array(hours.length).keys()].map(index => (
                                <tr className="timerow" key={index}>
                                    {this.props.mobile && this.state.selectedDay == null ? null : timeHeaders[index]}
                                    {this.props.mobile ? (
                                        this.state.selectedDay !== null ? showEntries[this.state.selectedDay][index] : null
                                        ) : (
                                        showEntries.map(day => day[index])
                                    )}
                                </tr>
                            ))
                        ) : null}
                    </tbody>
                </table>
            </div> 
        );
    }
}

export default ScheduleContainer;
