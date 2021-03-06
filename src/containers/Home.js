import React, { useState, useRef } from 'react';

import Axios from "axios";

import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { OverlayPanel } from 'primereact/overlaypanel';
import { DataView } from 'primereact/dataview';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Button } from 'primereact/button';

import TemplateSelector from "../components/TemplateSelector";
import PropertySelector from "../components/PropertySelector";

import DataTableContainer from "../containers/DataTable";
import DataViewCardContainer from "../containers/DataViewCard";

import CardView from "../components/CardView";

import { fetchOne } from "../utils/OmekaS";
import { authGet } from "../utils/Utils";

const textMaxLength = 150;

const Home = (props) => {
    const [screenMode, setScreenMode] = useState('view');
    const [viewMode, setViewMode] = useState('table');

    const toast = useRef(null);

    const [displayDialog, setDisplayDialog] = useState(false);
    const [dialogHeader, setDialogHeader] = useState(null);
    const [dialogContent, setDialogContent] = useState(null);

    const overlayPanel = useRef(null);
    const [overlayPanelItems, setOverlayPanelItems] = useState([]);

    const [dataViewCollection, setDataViewCollection] = useState([]);
    const [dataViewLoading, setDataViewLoading] = useState(false);
    const [dataViewFirst, setDataViewFirst] = useState(0);
    const [dataViewTotalRecords, setDataViewTotalRecords] = useState(0);
    const [dataViewProperties, setDataViewProperties] = useState([]);

    const [templates, setTemplates] = useState([]);
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [availableProperties, setAvailableProperties] = useState();
    const [activeProperties, setActiveProperties] = useState([]);

    const toggleViewMode = (toggleToMode) => {
        setViewMode(toggleToMode);
    }

    const showToast = (severityClass, summary, detail) => {
        toast.current.show({
            severity: severityClass,
            summary: summary,
            detail: detail,
            life: 5000
        });
    }

    const openDialog = (header, content) => {
        setDisplayDialog(true);
        setDialogContent(content);
        setDialogHeader(header);
    }

    const closeDialog = () => {
        setDisplayDialog(false);
        setDialogContent(null);
    }

    const openOverlayPanel = (event, items) => {
        overlayPanel.current.toggle(event);

        setDataViewFirst(0);
        setDataViewCollection([]);
        setOverlayPanelItems(items);
        setDataViewTotalRecords(items.length);

        loadLazyDataViewData(items[dataViewFirst]);
    }

    const onDataViewPage = (event) => {
        setDataViewLoading(true);
        const startIndex = event.first;
        setDataViewFirst(startIndex);
        loadLazyDataViewData(overlayPanelItems[startIndex]);
    }

    const propertyIsRelation = (property) => {
        return property['o:local_name'] && property['o:local_name'] === 'hasPart';
    }

    const loadLazyDataViewData = async (item) => {
        setDataViewLoading(true);
        fetchOne(
            item['value_resource_name'],
            item['value_resource_id']
        ).then(data => {
            let resourceTemplate = templates.filter(
                (template) => template['o:resource_class']['o:id'] === data['o:resource_class']['o:id']
            )[0];

            const requests = resourceTemplate["o:resource_template_property"].map((property) =>
                authGet(property["o:property"]["@id"])
            );

            Axios.all(requests).then(res => {
                let properties = res.map((inner) => inner.data);
                setDataViewProperties(properties);
                setDataViewCollection([parseItem(data, properties)]);
                setDataViewLoading(false);
            });
        });
    }

    const parseItem = (row, properties) => {
        if (properties && properties.length > 0) {
            let item = {'id': row['o:id']};
            properties.map((property) => {
                let label = property['o:label'];
                let value = null;

                if (row[property['o:term']] !== undefined) {
                    if (row[property['o:term']][0]['type'] === 'resource') {
                        value = row[property['o:term']];
                    } else {
                        let separator = '';
                        value = '';
                        row[property['o:term']].map((subItem) => {
                            if (subItem['@value'] !== undefined) {
                                value += separator + subItem['@value'];
                                separator = ' | ';
                            }
                            return null;
                        });
                    }
                }

                item[label] = value;
                return null;
            });

            if (row['thumbnail_display_urls']['square']) {
                item['thumbnail_url'] = row['thumbnail_display_urls']['square'];
            }

            return item;
        }
        return [];
    }

    const getCellTemplate = (cellData, field, longTextOption, showRelatedItens) => {
        if (cellData && (typeof cellData) === 'object') {
            if (showRelatedItens) {
                return relatedItemsButtonTemplate(cellData);
            }
        } else {
            if (cellData && cellData.length > textMaxLength) {
                return longTextTemplate(field, cellData, textMaxLength, longTextOption);
            } else {
                return cellData;
            }
        }
        return null;
    }

    const relatedItemsButtonTemplate = (items) => {
        return (
            <Button
                icon="pi pi-plus-circle"
                className="p-button-sm p-button-raised p-button-text"
                label={Object.keys(items).length + " related items"}
                onClick={(e) => openOverlayPanel(e, items) }
                aria-haspopup aria-controls="overlay_panel"
            />
      );
    }

    const longTextTemplate = (header, content, maxLength, templateOption) => {
        let template = null;
        switch (templateOption) {
            case 'dialog': 
                template = (
                    <div className="dialog-long-text-details">
                        <span>{content.substring(0, maxLength) + '...'}</span>
                        <Button
                            className="p-button-link p-py-0"
                            label="View More"
                            onClick={() => { openDialog(header, content);} }
                        />
                    </div>
                );
            break;
            case 'accordion': 
                template = (
                    <Accordion>
                        <AccordionTab header={header}>
                            <p>{content}</p>
                        </AccordionTab>
                    </Accordion>
                );
            break;
            default:
            break;
        }
        return template;
    }

    const dataViewGridTemplate = (rowData, layout) => {
        if (!rowData) {
            return null;
        }

        return cardViewTemplate(rowData, dataViewProperties, false);
    }

    const cardViewTemplate = (rowData, properties, showRelatedItens) => {
        return (
            <CardView
                cardClassName="p-col-12"
                cardData={rowData}
                properties={properties}
                showRelatedItens={showRelatedItens}
                getCellTemplate={getCellTemplate}
            />
        );
    }

    const containerContent = () => {
        if (viewMode === 'table') {
            return (
                <DataTableContainer
                    screenMode={screenMode}
                    setScreenMode={setScreenMode}
                    activeTemplate={activeTemplate}
                    availableProperties={availableProperties}
                    activeProperties={activeProperties}
                    showToast={showToast}
                    openDialog={openDialog}
                    propertyIsRelation={propertyIsRelation}
                    parseItem={parseItem}
                    getCellTemplate={getCellTemplate}
                    cardViewTemplate={cardViewTemplate}
                />
            );
        } else {
            return (
                <DataViewCardContainer
                    activeTemplate={activeTemplate}
                    activeProperties={activeProperties}
                    propertyIsRelation={propertyIsRelation}
                    getCellTemplate={getCellTemplate}
                />
            );
        }
    }

    return (
        <div className="home-container">
            <div className="p-grid p-ai-center p-py-1 p-px-3">
                <div className="p-col-2">
                    <div className="p-d-flex p-jc-end">
                        <TemplateSelector
                            screenMode={screenMode}
                            templates={templates}
                            setTemplates={setTemplates}
                            setActiveTemplate={setActiveTemplate}
                            setAvailableProperties={setAvailableProperties}
                        />
                    </div>
                </div>
                <div className="p-col-8">
                  <PropertySelector
                      screenMode={screenMode}
                      availableProperties={availableProperties}
                      setActiveProperties={setActiveProperties}
                  />
                </div>
                <div className="p-col-2">
                    <div className="p-d-flex p-jc-end">
                        <Button key="view-mode-table" label="Table" className="p-button-sm p-button-raised p-button-text" icon="pi pi-table" disabled={viewMode === 'table'} onClick={() => { toggleViewMode('table'); }} />
                        <Button key="view-mode-card" label="Card" className="p-button-sm p-button-raised p-button-text" icon="pi pi-image" disabled={viewMode === 'card'} onClick={() => { toggleViewMode('card'); }} />
                    </div>
                </div>
                <div className="p-col-12">
                    {containerContent()}
                </div>
            </div>
            <Toast
                ref={toast}
                position="top-left"
            />
            <Dialog
                header={dialogHeader}
                visible={displayDialog}
                maximizable
                style={{ width: '50vw' }}
                onHide={closeDialog}
            >
                {dialogContent}
            </Dialog>
            <OverlayPanel ref={overlayPanel} showCloseIcon id="overlay_panel" style={{width: '450px'}}>
                <DataView
                    value={dataViewCollection}
                    layout="grid"
                    itemTemplate={dataViewGridTemplate}
                    lazy
                    paginator
                    paginatorPosition={'both'}
                    paginatorTemplate="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                    rows={1}
                    totalRecords={dataViewTotalRecords}
                    first={dataViewFirst}
                    onPage={onDataViewPage}
                    loading={dataViewLoading}
                />
            </OverlayPanel>
        </div>
    );
};

export default Home;
