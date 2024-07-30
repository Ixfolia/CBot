// Require the necessary discord.js classes
const { Client, Collection, Events, GatewayIntentBits, Collection } = require("discord.js");
const { token } = require("./config.json");
const fs = require("node:fs");
const path = require("node:path");

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Create a new Collection to hold your commands.
client.commands = new Collection();

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        // Set a new item in the Collection
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log("[WARNING] The command at ${filePath} does not have a data or execute property.");
        }
    }


}



// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});


// Log in to Discord with your client"s token
client.login(token);