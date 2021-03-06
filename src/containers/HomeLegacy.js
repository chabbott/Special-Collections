import React, { useState, useEffect } from "react";
import { Layout } from "antd";

import axios from "axios";
import {
  getItems,
  getPropertyList,
  getPropertiesInResourceTemplate,
} from "../utils/Utils";
import ExplorerLegacy from "./ExplorerLegacy";

const { Content } = Layout;

const HomeLegacy = () => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [templateId, setTemplateId] = useState(0);
  const [propertyList, setPropertyList] = useState([]);
  const [propertyLoading, setPropertyLoading] = useState(false);

  const onArchiveCheck = (keys) => {
    if (keys.length > 0) {
      setDataLoading(true);
      getItems(keys)
        .then(
          axios.spread((...responses) => {
            let data = responses
              .filter((each) => !each.data["dcterms:hasPart"])
              .map((each) => ({ ...each.data, key: each.data["o:id"] }));
            setSelectedItems(data);
            setDataLoading(false);
          })
        )
        .catch((errors) => {});
    } else {
      setSelectedItems([]);
    }
  };

  useEffect(() => {
    setPropertyLoading(true);
    if (templateId === 0) {
      getPropertyList()
        .then((response) => {
          let classes = response.data.map((each) => ({
            id: each["o:id"],
            title: each["o:label"],
          }));
          setPropertyList(classes);
          let propertyData = response.data.map((each) => ({
            "o:term": each["o:term"],
            "o:label": each["o:label"],
          }));
          setSelectedProperties(propertyData);
        })
        .then(() => setPropertyLoading(false));
    } else {
      getPropertiesInResourceTemplate(templateId)
        .then(
          axios.spread((...responses) => {
            let properties = responses.map((each) => ({
              id: each.data["o:id"],
              title: each.data["o:label"],
            }));
            setPropertyList(properties);
            let propertyData = responses.map((each) => ({
              "o:term": each.data["o:term"],
              "o:label": each.data["o:label"],
            }));
            setSelectedProperties(propertyData);
          })
        )
        .then(() => {
          setPropertyLoading(false);
        });
    }
  }, [templateId]);

  return (
    <Layout
      style={{
        background: "#FFF",
      }}
    >
      <Layout style={{ padding: 24 }}>
        <Content>
          <ExplorerLegacy />
        </Content>
      </Layout>
    </Layout>
  );
};

export default HomeLegacy;
