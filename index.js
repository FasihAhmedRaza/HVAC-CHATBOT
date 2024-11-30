require('dotenv').config();
const { WebhookClient, Payload } = require('dialogflow-fulfillment');
const express = require("express");
const sheetdbNode = require('sheetdb-node');
const client = sheetdbNode({ address: 'https://sheetdb.io/api/v1/ivo5ixjauqrwb' });
const cors = require("cors");
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

app.post('/webhook', async (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });
  
  // Generate a unique reference ID
  function generateReferenceId() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

   // Welcome Intent (restored)
   async function hi(agent) {
    console.log(`intent => hi`);
    
    try {
      await client.create({ 
        // timestamp: new Date().toISOString(),
        customer_type: "New Interaction",
        query: "Welcome Intent"
      });
    } catch (error) {
      console.error('Error logging to sheet:', error);
    }
    
    agent.add("How can I help you today?");
    
    const richContentPayload = {
      "richContent": [
        [
          {
            "type": "image",
            "rawUrl": "https://firebasestorage.googleapis.com/v0/b/logo-d7556.appspot.com/o/HVACLogo5.svg?alt=media&token=401da99d-1692-437a-a5da-fa43566e4b51", // Replace with your actual logo URL
            "accessibilityText": "Company Logo"
          },
          {
            "type": "chips",
            "options": [
              {
                "text": "Tankless Quote "
              },
              {
                "text": "Furnace Quote"
              },
              {
                "text": "Heat Pump Quote "
              },
              {
                "text": "Air Conditioner Quote"
              },
              {
                "text": "Others"
              }
            ]
          }
        ]
      ]
    };

    agent.add(new Payload(agent.UNSPECIFIED, richContentPayload, { rawPayload: true, sendAsMessage: true }));
  }

  // Intent for initial service selection
  async function serviceSelectionIntent(agent) {
    console.log(`intent => serviceSelection`);
    
    // Log interaction
    try {
      await client.create({ 
        // timestamp: new Date().toISOString(),
        customer_type: "Service Selection",
        query: agent.query
      });
    } catch (error) {
      console.error('Error logging to sheet:', error);
    }

    // Set context for service selection
    const selectedService = agent.query;
    agent.setContext({
      name: 'service-context', 
      lifespan: 5, 
      parameters: { selectedService }
    });

    // Property type selection
    agent.add("Sure we can help with that ?");
    
    const richContentPayload = {
      "richContent": [
        [
          {
            "type": "chips",
            "options": [
              {
                "text": "Is this for a Residential Property"
              },
              {
                "text": "Is this for a Commercial Property"
              }
            ]
          }
        ]
      ]
    };
    
    agent.add(new Payload(agent.UNSPECIFIED, richContentPayload, { rawPayload: true, sendAsMessage: true }));
  }

  // Intent for property type selection
  async function propertyTypeIntent(agent) {
    console.log(`intent => propertyType`);
    
    // Get service from previous context
    const serviceContext = agent.getContext('service-context');
    const selectedService = serviceContext.parameters.selectedService;
    const selectedPropertyType = agent.query;

    // Set context for property type
    agent.setContext({
      name: 'property-context', 
      lifespan: 5, 
      parameters: { 
        selectedService, 
        selectedPropertyType 
      }
    });

    // Ask for user information
    agent.add(`Thank you, our ${selectedService} expert can call you shortly to go over the details and prices. Can I please have your name?`);

  }

  // Intent for collecting name
  async function collectNameIntent(agent) {
    console.log(`intent => collectName`);
    const name = agent.query;
    
    // Get previous contexts
    const serviceContext = agent.getContext('service-context');
    const propertyContext = agent.getContext('property-context');

    // Set context for name
    agent.setContext({
      name: 'name-context', 
      lifespan: 5, 
      parameters: { 
        name,
        selectedService: propertyContext.parameters.selectedService,
        selectedPropertyType: propertyContext.parameters.selectedPropertyType
      }
    });

    agent.add("Can i please have your Phone number ?");
  }

  // Intent for collecting phone and saving data
// Intent for collecting phone and saving data
async function saveInformationIntent(agent) {
  console.log(`intent => saveInformation`);
  const phone = agent.query;
  
  // Retrieve all context information
  const nameContext = agent.getContext('name-context');
  const referenceId = generateReferenceId();

  try {
    await client.create({
      reference_id: referenceId,
      service: nameContext.parameters.selectedService,
      property_type: nameContext.parameters.selectedPropertyType,
      name: nameContext.parameters.name,
      phone: phone,
      timestamp: new Date().toISOString()
    });
    agent.add(`Thank ${nameContext.parameters.name} our expert advisor will be in touch with you in 30 min or less to go over the details. `);
    // agent.add(`Thank you! We have received your request for ${nameContext.parameters.selectedService} for a ${nameContext.parameters.selectedPropertyType}. Your reference ID is ${referenceId}. Our team will contact you at ${phone} shortly.`);
  } catch (error) {
    console.error('Error saving user data:', error);
    agent.add("I'm sorry, but there was an issue saving your information. Please try again later.");
  }
}
  // Intent Map
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', hi);
  intentMap.set('Service Selection Intent', serviceSelectionIntent);
  intentMap.set('Property Type Intent', propertyTypeIntent);
  intentMap.set('Collect Name Intent', collectNameIntent);
  intentMap.set('Save Information Intent', saveInformationIntent);
  

  agent.handleRequest(intentMap);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
