import React, { useEffect, useState } from "react";
import { Select } from "antd";
import { setItemSet } from "../redux/actions";

import { connect } from "react-redux";

import { fetchItemSets } from "../utils/OmekaS";
const { Option } = Select;

const ItemSetSelector = (props) => {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    // get templates options on load
    const fetchOptions = async () => {
      const res = await fetchItemSets();

      const itemSetOptions = res.map((template) => (
        <Option key={template["o:id"]} value={template["o:id"]}>
          {template["o:title"]}
        </Option>
      ));

      const globalOption = (
        <Option key={-1} value={-1}>
          All Items
        </Option>
      );

      setOptions([globalOption].concat(itemSetOptions));
    };

    fetchOptions();
  }, []);

  const handleChange = async (value) => {
    props.setItemSet(value);
  };

  return (
    <Select
      style={{ width: "100%" }}
      placeholder="Please select item set"
      defaultValue={-1}
      onChange={handleChange}
    >
      {options}
    </Select>
  );
};

export default connect(null, { setItemSet })(ItemSetSelector);
