DELETE session WHERE expires < time::now();
