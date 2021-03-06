import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { Slider, Button, Modal, Descriptions } from "antd";
import AddNoteButton from "./AddNoteButton";
import { fetch, fetchOne, fetchResourceTemplates } from "../utils/OmekaS";
import { svg } from "d3";
import * as d3Legend from "d3-svg-legend";

/*
 * Note: In the future we will want this view to dynamically load nodes. The
 * best way to do this in my mind will be to change nodeData to a set, set its
 * initial state through props (perhaps as the response to some user defined
 * query), create a function that will take a node x, individually fetch each
 * node referenced by x, and add them to the set of loaded nodes. From here you
 * will be able to either create a button that calls this on every node in the
 * set (load nodes "1 hop out"), call the function on any node the user double
 * clicks, etc. It will be important to also update the edge list whenever new
 * nodes are added, and to check whether neighbors of x are already loaded in
 * order to avoid infinite fetching loops (the data in omeka is NOT acyclic).
 * 
 * Good luck! -miles olson
 */

const NetworkView = () => {
  const height = 1000;
  const width = 1500;
  const radiusCoefficient = 8;

  const RESULTS_PER_PAGE = 200;
  const MAX_RESULTS=700;

  const d3Container = useRef(null);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const [resourceTemplateProperties, setResourceTemplateProperties] = useState(
    {}
  );

  const [simulation, setSimulation] = useState(null);
  const [nodeData, setNodeData] = useState([]);
  const [linkData, setLinkData] = useState([]);

  const [linkDistance, setLinkDistance] = useState(30);
  const [repulsion, setRepulsion] = useState(-150);

  const [g, setG] = useState(null);
  const [node, setNode] = useState(null);
  const [link, setLink] = useState(null);
  const [textElements, setTextElements] = useState([]);

  const [onNodeKeys, setOnNodeKeys] = useState([]);

  // Initialize simulation
  useEffect(() => {
    console.log("Initializing simulation");

    const svg = d3.select(d3Container.current);
    setG(svg.append("g"));

    setSimulation(d3.forceSimulation());

    const tickActions = () => {
      if (node !== null) {
        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

        if (textElements !== null) {
          textElements
            .attr("x", (node) => node["x"] + 10)
            .attr("y", (node) => node["y"] + 4);
        }
      }

      if (link !== null) {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);
      }
    };

    const radii = Object.fromEntries(
      nodeData.map((d) => [
        d["o:id"],
        Math.sqrt(
          linkData.filter((link) => link.source === d["o:id"]).length + 1
        ) * radiusCoefficient,
      ])
    );

    if (nodeData.length > 0) {
      simulation
        .nodes(nodeData)
        .force(
          "link",
          d3
            .forceLink(linkData)
            .id((d) => d["o:id"])
            .distance(linkDistance)
        )
        .force("center_force", d3.forceCenter(width / 2, height / 2))
        .force("charge", d3.forceManyBody().strength(repulsion))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .force(
          "collide",
          d3.forceCollide((d) => radii[d["o:id"]])
        )
        .on("tick", tickActions);
    }
  }, [node, linkDistance, repulsion]);

  // Update nodes and links
  useEffect(() => {
    if (simulation === null) {
      return;
    }
    console.log("Updating states");

    setLink(
      g
        .attr("class", "links")
        .selectAll("line")
        .data(linkData)
        .enter()
        .append("line")
        .style("visibility", "visible")
        .attr("stroke-width", 1)
        .attr("stroke", "#999")
        .attr("stroke-opacity", 1)
    );

    const radii = Object.fromEntries(
      nodeData.map((d) => [
        d["o:id"],
        Math.sqrt(
          linkData.filter((link) => link.source === d["o:id"]).length + 1
        ) * radiusCoefficient,
      ])
    );

    setNode(
      g
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodeData)
        .enter()
        .append("circle")
        .attr("r", (d) => radii[d["o:id"]])
        .attr("fill", (d) => color(d["@type"][1]))
        .on("dblclick", function (d, i) {
          // if shifting select the node, else display modal
          if (d.shiftKey) {
            let [r, g, b] = d3.select(this).style("fill").split(", ");
            // let [r, g, b, _opacity] = d3.select(this).style("fill").split(", ");
            r = r.substring(r.indexOf("(") + 1);
            if (b[b.length - 1] === ")") {
              b = b.substring(0, b.length - 1);
            }

            if (onNodeKeys.includes(i.key)) {
              setOnNodeKeys(onNodeKeys.filter((node) => node !== i.key));
              d3.select(this).style(
                "fill",
                "rgba(" + r + ", " + g + ", " + b + ", 1)"
              );
            } else {
              setOnNodeKeys([...onNodeKeys, i.key]);
              // onNodeKeys.push(i.key);
              d3.select(this).style(
                "fill",
                "rgba(" + r + ", " + g + ", " + b + ", 0.4)"
              );
            }
          } else {
            console.log(i);

            const spawn_modal = async () => {
              let thumbnailUrl = "";
              if (i["o:media"].length !== 0) {
                const media = await fetchOne(
                  "media",
                  i["o:media"][0]["o:id"]
                );

                thumbnailUrl = media["o:thumbnail_urls"].square;
              }

              // TODO: IFF no template get class ID and search template library for use of class (pick first if multiple)
              const properties = i["o:resource_template"]
                ? resourceTemplateProperties[i["o:resource_template"]["o:id"]]
                : [];
              console.log(properties);
              console.log(
                properties.map((property) => (
                  <Descriptions.Item label={property["o:local_name"]}>
                    {i[property["o:term"]]}
                  </Descriptions.Item>
                ))
              );

              Modal.info({
                title: i["o:title"],
                content: (
                  <div>
                    {thumbnailUrl ? (
                      <img alt="example" src={thumbnailUrl} />
                    ) : null}
                    <Descriptions column={1} bordered>
                      {properties.map((property) => {
                        const value = i[property["o:term"]]
                          ? i[property["o:term"]][0]
                            ? i[property["o:term"]][0]["@value"]
                            : ""
                          : "";
                        return value ? (
                          <Descriptions.Item label={property["o:local_name"]}>
                            {value}
                          </Descriptions.Item>
                        ) : null;
                      })}
                    </Descriptions>
                  </div>
                ),
                onOk() {},
              });
            };

            spawn_modal();
          }
        })
        .call(
          d3
            .drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        )
    );

    setTextElements(
      g
        .selectAll("text")
        .data(nodeData)
        .enter()
        .append("text")
        .text((node) =>
          node["o:title"]
            ? node["o:title"].length > 20
              ? node["o:title"].substring(0, 20) + "..."
              : node["o:title"]
            : ""
        )
        .attr("font-size", 12)
        .attr("font-family", "Nunito")
        .attr("fill", "#555")
        .attr("x", (node) => node.x + 40 + 3 * node.r)
        .attr("y", (node) => node.y + 10 + node.r)
        .style("opacity", 1)
    );

    g.append("g")
      .attr("class", "legendOrdinal")
      .attr("transform", "translate(20,20)");

    const legendOrdinal = d3Legend
      .legendColor()
      .shape("path", d3.symbol().type(d3.symbolCircle).size(150)())
      .shapePadding(10)
      .cellFilter(function (d) {
        return d.label !== "e";
      })
      .labels((d) => {
        return d.generatedLabels[d.i].split(":").pop();
      })
      .scale(color);

    g.select(".legendOrdinal").call(legendOrdinal);

    function dragstarted() {
      simulation.tick();
      d3.select(this).raise();
      d3.select(this).attr("stroke", "black");
      g.attr("cursor", "grabbing");
    }

    function dragged(event, d) {
      simulation.restart();
      d3.select(this)
        .attr("cx", (d.x = event.x))
        .attr("cy", (d.y = event.y));
    }

    function dragended() {
      d3.select(this).attr("stroke", null);
      g.attr("cursor", null);
    }
  }, [linkData]);

  // get full data and resource templates (should run once)
  useEffect(() => {
    console.log("fetching...");

    const getResourceTemplateProperties = async () => {
      const templates = await fetchResourceTemplates();
      const template2properties = await Promise.all(
        templates.map(async (template) => {
          const properties = await Promise.all(
            template["o:resource_template_property"].map(
              async (property) =>
                await fetchOne(
                  "properties",
                  property["o:property"]["o:id"]
                )
            )
          );

          return [template["o:id"], properties];
        })
      );

      setResourceTemplateProperties(Object.fromEntries(template2properties));
    };



    const getData = async () => {
      let records = [];
      let keepGoing=true;
      //there might be an easy way to add nodes dynamically here
      //as the results come back
      let offset=0;
		  while (records.length<MAX_RESULTS){
			   let response = await fetch(
					"items",
					-1,
					{},
					offset,
					RESULTS_PER_PAGE
				  );
			  await records.push.apply(records,response);
			  offset += RESULTS_PER_PAGE;
			  //console.log(response);
		  };
	  //console.log("done!")
	  //console.log(records)
      setNodeData(records);
    };

    getResourceTemplateProperties();
    getData();
  }, []);

  useEffect(() => {
    if (nodeData.length === 0) return;
    const ids = nodeData.map((item) => item["o:id"]);
    console.log("Links created");

    setLinkData(
      nodeData.flatMap((node) => {
        const isPartOf = node["dcterms:isPartOf"] ?? [];
        const hasPart = node["dcterms:hasPart"] ?? [];
        const isReferencedBy = node["dcterms:isReferencedBy"] ?? [];
        const references = node["dcterms:references"] ?? [];

        return isPartOf
          .concat(
            hasPart.map((item) => ({
              source: node["o:id"],
              target: item["value_resource_id"],
            }))
          )
          .concat(
            isReferencedBy.map((item) => ({
              source: node["o:id"],
              target: item["value_resource_id"],
            }))
          )
          .concat(
            references.map((item) => ({
              source: node["o:id"],
              target: item["value_resource_id"],
            }))
          )
          .filter(
            (pair) => ids.includes(pair.source) && ids.includes(pair.target)
          );
      })
    );
  }, [nodeData]);

  const resetNodes = () => {
    const svg = d3.select(d3Container.current);
    let selection = svg
      .selectAll("circle")
      .style("fill", (d) => color(d["@type"][1]));
    setOnNodeKeys([]);
  };

  const onAfterRepulsionChange = (value) => {
    setRepulsion(-1 * value);
  };

  const onAfterLinkDistanceChange = (value) => {
    setLinkDistance(value);
  };

  const sliderStyle = {
    width: 400,
  };

  return (
    <div>
      <Button onClick={resetNodes}>Reset Nodes</Button>
      <AddNoteButton targets={onNodeKeys} />
      <h4>Repulsion ({-1 * repulsion})</h4>
      <Slider
        style={sliderStyle}
        defaultValue={-1 * repulsion}
        min={50}
        max={500}
        onAfterChange={onAfterRepulsionChange}
      />
      <h4>Link Distance ({linkDistance})</h4>
      <Slider
        style={sliderStyle}
        defaultValue={linkDistance}
        min={0}
        max={200}
        onAfterChange={onAfterLinkDistanceChange}
      />
      <svg
        className="d3-component"
        width={width}
        height={height}
        style={{ backgroundColor: "white" }}
        ref={d3Container}
      ></svg>
    </div>
  );
};

export default NetworkView;
