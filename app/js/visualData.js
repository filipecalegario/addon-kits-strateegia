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
                        const questionId_graph = `${questionId}.${contentId}`;
                        const questionText = arrayQuestions[j].question;
                        const questionCreatedAt = arrayQuestions[j].created_at;
                        addNode(questionId_graph, questionText, "question", contentCreatedAt, dashboard_url);
                        addLink(contentId, questionId_graph);
                    }

                    getCommentsGroupedByQuestionReport(access_token, contentId).then(question_report => {
                        const dashboard_url = `https://app.strateegia.digital/dashboard/project/${projectId}/mission/${missionId}/content/${contentId}`
                        console.log("getCommentsGroupedByQuestionReport()");
                        console.log(question_report);
                        for (let k = 0; k < question_report.length; k++) {
                            const questionId = question_report[k].id;
                            const questionId_graph = `${questionId}.${contentId}`;
                            const arrayComments = question_report[k].comments;
                            for (let w = 0; w < arrayComments.length; w++) {
                                const comment = arrayComments[w];
                                const commentId = comment.id;
                                const commentText = comment.text;
                                const commentCreatedAt = comment.created_at;
                                const commentCreatedBy = comment.created_by;
                                addNode(commentId, commentText, "comment", commentCreatedAt, dashboard_url);
                                addLink(questionId_graph, commentId);
                                const replies = comment.replies;
                                for (let reply_index = 0; reply_index < replies.length; reply_index++) {
                                    const reply = replies[reply_index];
                                    const replyId = reply.id;
                                    const replyText = reply.text;
                                    const replyCreatedAt = reply.created_at;
                                    const replyCreatedBy = reply.created_by;
                                    addNode(replyId, replyText, "reply", replyCreatedAt, dashboard_url);
                                    addLink(commentId, replyId);
                                    for (let reply_agreement_index = 0; reply_agreement_index < reply.agreements.length; reply_agreement_index++) {
                                        const reply_agreement = reply.agreements[reply_agreement_index];
                                        const reply_agreement_id = `${reply_agreement_index}.${replyId}`;
                                        const reply_agreement_created_at = reply_agreement.created_at;
                                        addNode(reply_agreement_id, "OK", "agreement", reply_agreement_created_at, dashboard_url);
                                        addLink(replyId, reply_agreement_id);
                                    }
                                }
                                const agreements = comment.agreements;
                                for(let agree_index = 0; agree_index < agreements.length; agree_index++) {
                                    const agreement = agreements[agree_index];
                                    const agreementId = `${agree_index}.${commentId}`
                                    addNode(agreementId, "OK", "agreement", agreement.created_at, dashboard_url);
                                    addLink(commentId, agreementId);
                                }
                            }
                        }
                    })
                        .then(d => {
                            // f_data.nodes = c_data.nodes.filter((d) => { return (d.group != "user" && d.group != "users")});
                            // f_data.links = c_data.links.filter((d) => { return nodes_contains_users(d, f_data.nodes) });
                            f_data.nodes = c_data.nodes;
                            f_data.links = c_data.links;
                            buildGraph(c_data.nodes, c_data.links);
                            initializeSimulation(c_data.nodes, c_data.links);
                        });
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