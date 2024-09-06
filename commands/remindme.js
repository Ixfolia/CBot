const { SlashCommandBuilder } = require('discord.js');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

let reminders = []; // This will hold reminders. In production, consider using a database.

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remindme')
        .setDescription('Manage reminders')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new reminder')
                .addStringOption(option =>
                    option.setName('interval')
                        .setDescription('How often the reminder should occur')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Once', value: 'once' },
                            { name: 'Daily', value: 'daily' },
                            { name: 'Weekly', value: 'weekly' },
                            { name: 'Monthly', value: 'monthly' },
                            { name: 'Every 5 seconds', value: '5-seconds' } // Added option for testing
                        ))
                .addStringOption(option =>
                    option.setName('datetime')
                        .setDescription('Date and time for the first reminder (YYYY-MM-DD HH:MM)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('The reminder message')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('mentions')
                        .setDescription('Mention users by tagging them (@User1 @User2 ...)')
                        .setRequired(false))) // Optional mention string for multiple users
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active reminders'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setDescription('Cancel a reminder')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('The ID of the reminder to cancel')
                        .setRequired(true))),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'create') {
            return createReminder(interaction);
        } else if (interaction.options.getSubcommand() === 'list') {
            return listReminders(interaction);
        } else if (interaction.options.getSubcommand() === 'cancel') {
            const id = interaction.options.getString('id');
            return cancelReminder(interaction, id);
        }
    }
};

function createReminder(interaction) {
    const interval = interaction.options.getString('interval');
    const datetime = interaction.options.getString('datetime');
    const message = interaction.options.getString('message');
    const mentions = interaction.options.getString('mentions') || ''; // Mentions entered as a string
    const id = uuidv4();

    console.log(`Creating reminder: interval=${interval}, datetime=${datetime}, message=${message}, mentions=${mentions}, id=${id}`);

    const date = new Date(datetime);
    if (isNaN(date.getTime())) {
        return interaction.reply({ content: 'Invalid date format. Please use YYYY-MM-DD HH:MM', ephemeral: true });
    }

    const defaultMention = mentions || `<@${interaction.user.id}>`; // Default to original user if no mentions

    switch (interval) {
        case 'once':
            scheduleSingleReminder(interaction, date, message, defaultMention, id);
            break;
        case 'daily':
            scheduleRecurringReminder(interaction, date, message, defaultMention, `0 ${date.getUTCHours()} * * *`, id);
            break;
        case 'weekly':
            scheduleRecurringReminder(interaction, date, message, defaultMention, `0 ${date.getUTCHours()} * * ${date.getUTCDay()}`, id);
            break;
        case 'monthly':
            scheduleRecurringReminder(interaction, date, message, defaultMention, `${date.getUTCMinutes()} ${date.getUTCHours()} ${date.getUTCDate()} * *`, id);
            break;
        case '5-seconds':
            scheduleRecurringReminder(interaction, date, message, defaultMention, '*/5 * * * * *', id);
            break;
        default:
            interaction.reply({ content: 'Invalid interval option.', ephemeral: true });
            return;
    }

    interaction.reply({ content: `Reminder set for ${datetime} (${interval}) with ID ${id}: ${message}`, ephemeral: true });
}

function scheduleSingleReminder(interaction, date, message, mentions, id) {
    const now = new Date();
    const delay = date.getTime() - now.getTime();

    if (delay <= 0) {
        interaction.reply({ content: 'The date and time must be in the future!', ephemeral: true });
        return;
    }

    const timeout = setTimeout(async () => {
        try {
            await interaction.channel.send({ content: `🔔 ${mentions} Reminder: ${message}` });
            reminders = reminders.filter(reminder => reminder.id !== id);
        } catch (error) {
            console.error('Error sending reminder:', error);
        }
    }, delay);

    reminders.push({ id, type: 'single', timeout, date, message, userId: interaction.user.id });
}

function scheduleRecurringReminder(interaction, date, message, mentions, cronExpression, id) {
    const task = cron.schedule(cronExpression, async () => {
        try {
            await interaction.channel.send({ content: `🔔 ${mentions} Reminder: ${message}` });
        } catch (error) {
            console.error('Error sending recurring reminder:', error);
        }
    });

    reminders.push({ id, type: 'recurring', task, date, message, userId: interaction.user.id });
}

function listReminders(interaction) {
    if (reminders.length === 0) {
        return interaction.reply({ content: 'No active reminders.', ephemeral: true });
    }

    const reminderList = reminders.map(r => `ID: ${r.id}, Type: ${r.type}, Message: ${r.message}`).join('\n');
    interaction.reply({ content: `Active Reminders:\n${reminderList}`, ephemeral: true });
}

function cancelReminder(interaction, id) {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) {
        return interaction.reply({ content: `No reminder found with ID ${id}.`, ephemeral: true });
    }

    if (reminder.type === 'single') {
        clearTimeout(reminder.timeout);
    } else if (reminder.type === 'recurring') {
        reminder.task.stop();
    }

    reminders = reminders.filter(r => r.id !== id);
    interaction.reply({ content: `Reminder with ID ${id} has been canceled.`, ephemeral: true });
}
