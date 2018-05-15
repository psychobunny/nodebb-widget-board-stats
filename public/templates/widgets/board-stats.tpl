<div component="widget/board-stats" class="widget-board-stats">
    <h3>Who's Online <a href="{config.relative_path}/users?section=online">[Full List]</a></h3>
    <p>
        <span component="widget/board-stats/count">{count}</span> users active right now (<span component="widget/board-stats/members">{members}</span> members and <span component="widget/board-stats/guests">{guests}</span> guests).<br />
        <span component="widget/board-stats/list">{list}</span>
    </p>

    <h3>Board Statistics</h3>
    <p>
        Our members have made a total of <strong component="widget/board-stats/posts">{posts}</strong> posts in <strong component="widget/board-stats/topics">{topics}</strong> topics.<br />
        We currently have <strong component="widget/board-stats/registered">{registered}</strong> members registered.<br />
        Please welcome our newest member, <span component="widget/board-stats/latest">{latest}</span>.<br />

        The most users online at one time was <strong>{mostUsers.total}</strong> on {mostUsers.date}.
    </p>
</div>