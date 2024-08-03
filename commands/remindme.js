const { SlashCommandBuilder } = require('discord.js');
const cron = require('node-cron');

const reminders = []; // This will hold reminders. In production, consider using a database.

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remindme')
        .setDescription('Set a reminder')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Single or Monthly reminder')
                .setRequired(true)
                .addChoices(
                    { name: 'Single', value: 'single' },
                    { name: 'Monthly', value: 'monthly' }
                ))
        .addStringOption(option =>
            option.setName('datetime')
                .setDescription('Date and time for the reminder (YYYY-MM-DD HH:MM)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The reminder message')
                .setRequired(true)),

    async execute(interaction) {
        const type = interaction.options.getString('type');
        const datetime = interaction.options.getString('datetime');
        const message = interaction.options.getString('message');

        // Log command details for debugging
        console.log(`Received /remindme command: type=${type}, datetime=${datetime}, message=${message}`);

        // Validate datetime format
        const date = new Date(datetime);
        if (isNaN(date.getTime())) {
            return interaction.reply({ content: 'Invalid date format. Please use YYYY-MM-DD HH:MM', ephemeral: true });
        }

        // Schedule the reminder
        if (type === 'single') {
            console.log('Scheduling single reminder...');
            scheduleSingleReminder(interaction, date, message);
        } else if (type === 'monthly') {
            console.log('Scheduling monthly reminder...');
            scheduleMonthlyReminder(interaction, date, message);
        }

        await interaction.reply({ content: `Reminder set for ${datetime}: ${message}`, ephemeral: true });
    }
};

function scheduleSingleReminder(interaction, date, message) {
    const now = new Date();
    const delay = date.getTime() - now.getTime();
    
    console.log(`Current time: ${now}`);
    console.log(`Scheduled time: ${date}`);
    console.log(`Delay in ms: ${delay}`);

    if (delay <= 0) {
        interaction.followUp({ content: 'The date and time must be in the future!', ephemeral: true });
        return;
    }

    const timeout = setTimeout(async () => {
        console.log(`Sending reminder for message: ${message}`);
        try {
            // Ping the user by mentioning them in the message
            await interaction.followUp({ content: `🔔 <@${interaction.user.id}> Reminder: ${message}` });
        } catch (error) {
            console.error('Error sending reminder:', error);
        }
    }, delay);

    reminders.push({ timeout, date, message, userId: interaction.user.id });
}

function scheduleMonthlyReminder(interaction, date, message) {
    const cronTime = `${date.getUTCMinutes()} ${date.getUTCHours()} ${date.getUTCDate()} * *`;
    
    console.log(`Cron expression for monthly reminder: ${cronTime}`);

    const task = cron.schedule(cronTime, async () => {
        console.log(`Sending monthly reminder for message: ${message}`);
        try {
            // Ping the user by mentioning them in the message
            await interaction.followUp({ content: `🔔 <@${interaction.user.id}> Monthly Reminder: ${message}` });
        } catch (error) {
            console.error('Error sending monthly reminder:', error);
        }
    });

    reminders.push({ task, date, message, userId: interaction.user.id });
}
