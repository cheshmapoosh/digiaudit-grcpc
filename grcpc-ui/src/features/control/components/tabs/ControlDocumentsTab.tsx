import { DocumentIntegrationDeferredMessage } from "@/features/document";

export interface ControlDocumentsTabProps {
    controlId: string;
    readOnly?: boolean;
    showActions?: boolean;
}

export default function ControlDocumentsTab(props: ControlDocumentsTabProps) {
    void props;

    return <DocumentIntegrationDeferredMessage />;
}
