const access_token = localStorage.getItem("strateegia_api_token");
console.log(localStorage);

let c_data = {
    "nodes": [],
    "links": []
};

let f_data = {};

function addNode(id, title, group, created_at, dashboard_url) {
    let date = new Date(created_at)
    //let parseTime = d3.timeFormat("%Y-%m-%dT%H:%M:%S.%L");
    //let parsedDate = parseTime(date);
    c_data["nodes"].push({
        "id": id,
        "title": title,
        "group": group,
        "created_at": date,
        "dashboard_url": dashboard_url
    });
}

function addLink(source, target) {
    let target_node = c_data["nodes"].find(x => x.id === target)
    if (target_node != undefined) {
        target_node.parent_id = source;
    }
    c_data["links"].push({
        "source": source,
        "target": target
    });
}

function drawProject(projectId) {

    const ADD_USERS = false;

    // console.log(projectId);
    c_data = {
        "nodes": [],
        "links": []
    }
    getProjectById(access_token, projectId).then(project => {
        console.log("getProjectById()")
        console.log(project);
        const dashboard_url = `https://app.strateegia.digital/dashboard/project/${projectId}`;
        if (project.missions.length > 1) {
            addNode(projectId, project.title, "project", project.created_at, dashboard_url);
        }
        if (ADD_USERS) {
            addNode("users", "Usuários", "users");
            for (let index = 0; index < project.users.length; index++) {
                const user = project.users[index];
                addNode(user.id, user.name, "user");
                addLink("users", user.id);
            }
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
                                if(ADD_USERS){
                                    addLink(commentCreatedBy, commentId);
                                }
                            }
                        }).then(d => {
                            // f_data.nodes = c_data.nodes.filter((d) => { return (d.group != "user" && d.group != "users")});
                            // f_data.links = c_data.links.filter((d) => { return nodes_contains_users(d, f_data.nodes) });
                            f_data.nodes = c_data.nodes;
                            f_data.links = c_data.links;
                            buildGraph(c_data.nodes, c_data.links);
                            initializeSimulation(c_data.nodes, c_data.links);
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