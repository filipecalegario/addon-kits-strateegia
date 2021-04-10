const access_token = localStorage.getItem("strateegia_api_token");
console.log(localStorage);

let consolidated_data = {
    "nodes": [],
    "links": []
}

function addNode(id, title, group, created_at, dashboard_url) {
    let date = new Date(created_at)
    //let parseTime = d3.timeFormat("%Y-%m-%dT%H:%M:%S.%L");
    //let parsedDate = parseTime(date);
    consolidated_data["nodes"].push({
        "id": id,
        "title": title,
        "group": group,
        "created_at": date,
        "dashboard_url": dashboard_url
    });
}

function addLink(source, target) {
    let target_node = consolidated_data["nodes"].find(x => x.id === target)
    if(target_node != undefined){
        target_node.parent_id = source;
    }
    consolidated_data["links"].push({
        "source": source,
        "target": target
    });
}

function drawProject(projectId) {

    // console.log(projectId);
    consolidated_data = {
        "nodes": [],
        "links": []
    }
    getProjectById(access_token, projectId).then(project => {
        console.log("getProjectById()")
        console.log(project);
        if (project.missions.length > 1) {
            addNode(projectId, project.title, "project", project.created_at, `https://app.strateegia.digital/dashboard/project/${projectId}`);
        }
        // addNode("users", "Usuários", "users");
        for (let index = 0; index < project.users.length; index++) {
            const user = project.users[index];
            // addNode(user.id, user.name, "user");
            // addLink("users", user.id);
        }
        for (let a = 0; a < project.missions.length; a++) {
            const currentMission = project.missions[a];
            const missionId = project.missions[a].id;
            getMapById(access_token, missionId).then(map_response => {
                console.log("getMapById()");
                console.log(map_response);
                const missionId = map_response.id;
                const missionTitle = map_response.title;
                const missionCreatedAt = map_response.created_at;
                const projectId = map_response.project_id;
                const dashboard_url = `https://app.strateegia.digital/dashboard/project/${projectId}/mission/${missionId}`;
                addNode(missionId, missionTitle, "map", missionCreatedAt, dashboard_url);
                if (project.missions.length > 1) {
                    addLink(projectId, missionId);
                }
            });
            // console.log(missionId + " -> " + missionTitle);
            getAllContentsByMissionId(access_token, missionId).then(response => {
                console.log("getAllContentsByMissionId()")
                console.log(response);
                let arrayContents = response.content;
                for (let i = 0; i < arrayContents.length; i++) {
                    const missionId = arrayContents[i].mission_id;
                    const contentId = arrayContents[i].id;
                    const contentCreatedAt = arrayContents[i].created_at;
                    const kitId = arrayContents[i].kit.id;
                    const kitTitle = arrayContents[i].kit.title;
                    const kitCreatedAt = arrayContents[i].kit.created_at;
                    const dashboard_url = `https://app.strateegia.digital/dashboard/project/${projectId}/mission/${missionId}/content/${contentId}`
                    addNode(contentId, kitTitle, "kit", contentCreatedAt, dashboard_url);
                    addLink(missionId, contentId);
                    const arrayQuestions = arrayContents[i].kit.questions;
                    for (let j = 0; j < arrayQuestions.length; j++) {
                        const questionId = arrayQuestions[j].id;
                        const questionId_graph = `${arrayQuestions[j].id}.${contentId}`;
                        const questionText = arrayQuestions[j].question;
                        const questionCreatedAt = arrayQuestions[j].created_at;
                        addNode(questionId_graph, questionText, "question", contentCreatedAt, dashboard_url);
                        addLink(contentId, questionId_graph);
                        getParentComments(access_token, contentId, questionId).then(response => {
                            console.log("getParentComments()")
                            console.log(response);
                            let arrayComments = response.content;
                            for (let k = 0; k < arrayComments.length; k++) {
                                const questionId = arrayComments[k].question_id;
                                const commentId = arrayComments[k].id;
                                const commentText = arrayComments[k].text;
                                const commentCreatedAt = arrayComments[k].created_at;
                                const commentCreatedBy = arrayComments[k].created_by;
                                // console.log(commentText);
                                addNode(commentId, commentText, "comment", commentCreatedAt, dashboard_url);
                                addLink(questionId_graph, commentId);
                                //addLink(commentCreatedBy, commentId);
                            }
                        }).then(d => {
                            buildGraph(consolidated_data.nodes, consolidated_data.links);
                            initializeSimulation(consolidated_data.nodes, consolidated_data.links);
                            // console.log(calcTime(consolidated_data.nodes));
                        });
                    }
                }
            });
        }
    });
}



getAllProjects(access_token).then(labs => {
    console.log("getAllProjects()");
    console.log(labs);
    // Initial project
    drawProject(labs[0].projects[0].id)
    let listProjects = [];
    for (let i = 0; i < labs.length; i++) {
        let currentLab = labs[i];
        if (currentLab.lab.name == null) {
            currentLab.lab.name = "Personal";
        }
        for (let j = 0; j < currentLab.projects.length; j++) {
            const project = currentLab.projects[j];
            console.log(`${currentLab.lab.name} -> ${project.title}`);
            listProjects.push({
                "id": project.id,
                "title": project.title,
                "lab_id": currentLab.lab.id,
                "lab_title": currentLab.lab.name
            });
        }
    }
    let options = d3.select("#projects-list")
        .on("change", () => {
            let selected_project = d3.select("#projects-list").property('value');
            drawProject(selected_project);
        })
        .selectAll("option")
        .data(listProjects);

    options.enter()
        .append("option")
        .attr("value", (d) => { return d.id })
        .text((d) => { return `${d.lab_title} -> ${d.title}` });
});

// document.addEventListener("DOMContentLoaded", function () {
//     let selected_project = d3.select("#projects-list").property('value');
//     drawProject(selected_project);
// });

function addMarkup(markup) {
    const container = document.getElementById("scrubber");
    container.innerHTML = markup;
    // addListenerMakeAvailable(projects);
}

function Scrubber(values, {
    format = value => value,
    initial = 0,
    delay = null,
    autoplay = true,
    loop = true,
    loopDelay = null,
    alternate = false
} = {}) {
    values = Array.from(values);
    const form = `<form style="font: 12px var(--sans-serif); font-variant-numeric: tabular-nums; display: flex; height: 33px; align-items: center;">
    <button name=b type=button style="margin-right: 0.4em; width: 5em;"></button>
    <label style="display: flex; align-items: center;">
      <input name=i type=range min=0 max=${values.length - 1} value=${initial} step=1 style="width: 180px;">
      <output name=o style="margin-left: 0.4em;"></output>
    </label>
  </form>`;
    let frame = null;
    let timer = null;
    let interval = null;
    let direction = 1;

    function start() {
        form.b.textContent = "Pause";
        if (delay === null) frame = requestAnimationFrame(tick);
        else interval = setInterval(tick, delay);
    }

    function stop() {
        form.b.textContent = "Play";
        if (frame !== null) cancelAnimationFrame(frame), frame = null;
        if (timer !== null) clearTimeout(timer), timer = null;
        if (interval !== null) clearInterval(interval), interval = null;
    }

    function running() {
        return frame !== null || timer !== null || interval !== null;
    }

    function tick() {
        if (form.i.valueAsNumber === (direction > 0 ? values.length - 1 : direction < 0 ? 0 : NaN)) {
            if (!loop) return stop();
            if (alternate) direction = -direction;
            if (loopDelay !== null) {
                if (frame !== null) cancelAnimationFrame(frame), frame = null;
                if (interval !== null) clearInterval(interval), interval = null;
                timer = setTimeout(() => (step(), start()), loopDelay);
                return;
            }
        }
        if (delay === null) frame = requestAnimationFrame(tick);
        step();
    }

    function step() {
        form.i.valueAsNumber = (form.i.valueAsNumber + direction + values.length) % values.length;
        form.i.dispatchEvent(new CustomEvent("input", { bubbles: true }));
    }
    form.i.oninput = event => {
        if (event && event.isTrusted && running()) stop();
        form.value = values[form.i.valueAsNumber];
        form.o.value = format(form.value, form.i.valueAsNumber, values);
    };
    form.b.onclick = () => {
        if (running()) return stop();
        direction = alternate && form.i.valueAsNumber === values.length - 1 ? -1 : 1;
        form.i.valueAsNumber = (form.i.valueAsNumber + direction) % values.length;
        form.i.dispatchEvent(new CustomEvent("input", { bubbles: true }));
        start();
    };
    form.i.oninput();
    if (autoplay) start();
    else stop();
    disposal(form).then(stop);
    return form;
}