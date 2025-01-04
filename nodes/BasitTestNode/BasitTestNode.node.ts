import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
  } from 'n8n-workflow';

  import { NodeConnectionType } from 'n8n-workflow';
  
  export class BasitNodeTest implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Basit-Test-Node',
        name: 'BasitNodeTest',
        group: ['transform'],
        version: 1
        ,
        description: 'Custom action to integrate Salesforce with Google Drive',
        defaults: {
            name: 'Basit-Test-Node',
        },
        inputs: [
			{
				displayName: 'Main Input',
				type: NodeConnectionType.Main,
			},
		],
		outputs: [
		{
			displayName: 'Main output',
			type: NodeConnectionType.Main,
		},
	    ],
        properties: [
            {
                displayName: 'Action',
                name: 'action',
                type: 'options',
                options: [
                    { name: 'Fetch Salesforce Data', value: 'fetchSalesforceData' },
                    { name: 'Upload to Google Drive', value: 'uploadToGoogleDrive' },
                ],
                default: 'fetchSalesforceData',
            },
            {
                displayName: 'Salesforce Query',
                name: 'salesforceQuery',
                type: 'string',
                default: 'SELECT Id, Name FROM Account',
                description: 'SOQL query to fetch data from Salesforce',
                displayOptions: {
                    show: {
                        action: ['fetchSalesforceData'],
                    },
                },
            },
            {
                displayName: 'Google Drive Folder ID',
                name: 'googleDriveFolderId',
                type: 'string',
                default: '',
                description: 'The ID of the folder in Google Drive where files will be uploaded',
                displayOptions: {
                    show: {
                        action: ['uploadToGoogleDrive'],
                    },
                },
            },
            {
                displayName: 'File Name',
                name: 'fileName',
                type: 'string',
                default: 'UploadedFile.txt',
                description: 'The name of the file to upload to Google Drive',
                displayOptions: {
                    show: {
                        action: ['uploadToGoogleDrive'],
                    },
                },
            },
            {
                displayName: 'File Content',
                name: 'fileContent',
                type: 'string',
                default: 'This is a sample file.',
                description: 'The content of the file to upload to Google Drive',
                displayOptions: {
                    show: {
                        action: ['uploadToGoogleDrive'],
                    },
                },
            },
        ],
    };
  
  
    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
      const action = this.getNodeParameter('action', 0) as string;
  
    const n8nWebhookUrl = 'https://your-n8n-instance.com/webhook/dynamic-integration';
  
    const orgSelection = await this.helpers.request({
      method: 'POST',
      url: 'https://your-agent-ai-api-url/decide-org',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        context: this.getWorkflowStaticData('global'),
      }),
    });
  
    // Send the response from AI Agent to n8n webhook
    await this.helpers.request({
      method: 'POST',
      url: n8nWebhookUrl,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'AI_Agent_Decision',
        data: JSON.parse(orgSelection),
      }),
    });
  
  
      const { selectedSalesforceOrg, selectedGoogleDrive } = JSON.parse(orgSelection);
  
      if (action === 'fetchSalesforceData') {
          const query = this.getNodeParameter('salesforceQuery', 0) as string;
          const { instanceUrl, accessToken } = selectedSalesforceOrg;
  
          const response = await this.helpers.request({
              method: 'GET',
              url: `${instanceUrl}/services/data/v53.0/query?q=${encodeURIComponent(query)}`,
              headers: {
                  Authorization: `Bearer ${accessToken}`,
              },
          });
  
          return [this.helpers.returnJsonArray(JSON.parse(response))];
      }
  
      if (action === 'uploadToGoogleDrive') {
          const folderId = this.getNodeParameter('googleDriveFolderId', 0) as string;
          const fileName = this.getNodeParameter('fileName', 0) as string;
          const fileContent = this.getNodeParameter('fileContent', 0) as string;
          const { accessToken } = selectedGoogleDrive;
  
          const response = await this.helpers.request({
              method: 'POST',
              url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
              headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'multipart/related; boundary=boundary',
              },
              body: `
  --boundary
  Content-Type: application/json; charset=UTF-8
  
  {"name": "${fileName}", "parents": ["${folderId}"]}
  --boundary
  Content-Type: text/plain
  
  ${fileContent}
  --boundary--`,
          });
  
          return [this.helpers.returnJsonArray(JSON.parse(response))];
      }
  
      return [this.helpers.returnJsonArray({ success: false, message: 'Invalid action' })];
  }
  
  }